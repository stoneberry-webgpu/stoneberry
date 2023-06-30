import { HasReactive, reactively } from "@reactively/decorate";
import {
  Cache,
  ComposableShader,
  ValueOrFn,
  assignParams,
  createDebugBuffer,
  gpuTiming,
  reactiveTrackUse,
  trackContext,
  withBufferCopy,
} from "thimbleberry";
import { BinOpTemplate, maxF32 } from "../util/BinOpTemplate.js";
import { SlicingResults, inputSlicing } from "../util/InputSlicing.js";
import { getBufferReducePipeline } from "./ReduceBufferPipeline.js";

export interface BufferReduceParams {
  device: GPUDevice;
  /**
   * Source data to be reduced.
   *
   * A function returning the source buffer will be executed lazily,
   * and reexecuted if the function's `@reactively` source values change.
   */
  source: ValueOrFn<GPUBuffer>;

  /** {@inheritDoc ReduceBuffer#sourceOffset} */
  sourceOffset?: number;

  /** {@inheritDoc ReduceBuffer#resultOffset} */
  resultOffset?: number;

  /** {@inheritDoc ReduceBuffer#blockLength} */
  blockLength?: number;

  /** {@inheritDoc ReduceBuffer#workgroupLength} */
  workgroupLength?: number;

  /** {@inheritDoc ReduceBuffer#maxWorkgroups} */
  maxWorkgroups?: number | undefined;

  /** {@inheritDoc ReduceBuffer#template} */
  template?: BinOpTemplate;

  /** cache for GPUComputePipeline */
  pipelineCache?: <T extends object>() => Cache<T>;

  /** {@inheritDoc ReduceBuffer#label} */
  label?: string;
}

const defaults: Partial<BufferReduceParams> = {
  blockLength: 4,
  sourceOffset: 0,
  resultOffset: 0,
  template: maxF32,
  workgroupLength: undefined,
  maxWorkgroups: undefined,
  label: "",
};

/**
 * Reduce workgroup sized blocks of data to single elements.
 *
 * A full reduction requires running this shader repeatedly, each time
 * reducing the previously reduced buffer until only a single workgroup
 * sized block remains. Then the final reduction will reduce one block to
 * a buffer containing only a single element.
 *
 * The reduce operation is controlled by template: could be sum,min,max, etc.
 */
export class ReduceBuffer extends HasReactive implements ComposableShader {
  /** Source data to be reduced */
  @reactively source!: GPUBuffer;

  /** macros to customize wgsl shader for size of data and type of reduce*/
  @reactively template!: BinOpTemplate;

  /** Debug label attached to gpu objects for error reporting */
  @reactively label?: string;

  /** start scan at this element offset in the source. (0) */
  @reactively sourceOffset!: number;

  /** start emitting results at this element offset in the results. (0) */
  @reactively resultOffset!: number;

  /** number of elements to reduce in each invocation (4) */
  @reactively blockLength!: number;

  /** Override to set compute workgroup size e.g. for testing. 
    @defaultValue maxComputeInvocationsPerWorkgroup of the `GPUDevice` (256)
    */
  @reactively workgroupLength?: number;

  /** Override to set max number of workgroups for dispatch e.g. for testing. 
    @defaultValue maxComputeWorkgroupsPerDimension from the `GPUDevice` (65535)
    */
  @reactively maxWorkgroups?: number;

  private device!: GPUDevice;
  private pipelineCache?: <T extends object>() => Cache<T>;
  private usageContext = trackContext();

  constructor(params: BufferReduceParams) {
    super();
    assignParams<ReduceBuffer>(this, params, defaults);
  }

  commands(commandEncoder: GPUCommandEncoder): void {
    this.writeUniforms();

    const sourceBind = this.sourceBindGroup;
    const inputSlices = this.inputSlicing;
    this.sourceReductions.forEach((dispatchSize, i) => {
      const dispatchLabel = `${dispatchSize} #${i}`;
      const offset = [inputSlices.slices[i].uniformOffset];
      // dlog({ sourceDispatchSize: dispatchSize, i, offset });
      this.encodePass(commandEncoder, sourceBind, dispatchSize, offset, dispatchLabel);
    });

    const layerBindGroups = this.layerBindGroups;
    this.layerReductions.forEach((dispatchSize, i) => {
      // dlog({ layerDispatchSize: dispatchSize, i });
      const dispatchLabel = `${dispatchSize} #${i}`;
      const bindGroup = layerBindGroups[i];
      this.encodePass(commandEncoder, bindGroup, dispatchSize, [0], dispatchLabel);
    });
  }

  private encodePass(
    commandEncoder: GPUCommandEncoder,
    bindGroup: GPUBindGroup,
    dispatch: number,
    dynamicOffsets: Uint32Array | number[] | undefined,
    dispatchLabel: string
  ): void {
    const label = `${this.label} bufferReduce ${dispatchLabel}`;
    const timestampWrites = gpuTiming?.timestampWrites(label);
    const passEncoder = commandEncoder.beginComputePass({ timestampWrites });
    passEncoder.label = label;
    passEncoder.setPipeline(this.pipeline());
    passEncoder.setBindGroup(0, bindGroup, dynamicOffsets);
    passEncoder.dispatchWorkgroups(dispatch, 1, 1);
    passEncoder.end();
  }

  /** Release the result buffer and intermediate buffers for destruction. */
  destroy(): void {
    this.usageContext.finish();
  }

  /** Execute the reduce immediately and copy the results back to the CPU.
   * (results are copied from the {@link ReduceBuffer.result} GPUBuffer)
   * @returns a single reduced result value in an array
   */
  async reduce(): Promise<number[]> {
    const commands = this.device.createCommandEncoder({
      label: `${this.label} reduceBuffer`,
    });
    this.commands(commands);
    this.device.queue.submit([commands.finish()]);
    await this.device.queue.onSubmittedWorkDone();

    const format = this.template.outputElements;
    if (!format) {
      throw new Error(
        `outputElement format not defined: ${JSON.stringify(this.template, null, 2)}`
      );
    }
    const data = await withBufferCopy(this.device, this.result, format, d => d.slice());
    this.template.outputElementSize;
    return [...data];
  }

  /** Buffer containing results of the reduce after the shader has run. */
  @reactively get result(): GPUBuffer {
    return this.resultBuffers().slice(-1)[0];
  }

  /** @internal */
  @reactively get debugBuffer(): GPUBuffer {
    const buffer = createDebugBuffer(this.device, "BufferReduce debug");
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  /** Strategy for partitioning large sources into multiple dispatches
   * and a partitioned uniform buffer */
  @reactively private get inputSlicing(): SlicingResults {
    return inputSlicing({
      elems: this.sourceElems,
      elemsPerDispatch: this.actualWorkgroupLength * this.blockLength,
      maxDispatches: this.actualMaxWorkgroups,
      uniformAlignSize: this.device.limits.minUniformBufferOffsetAlignment,
      baseUniformSize: 8,
    });
  }

  /** one or more dispatches to cover the source */
  @reactively private get sourceReductions(): number[] {
    return this.inputSlicing.slices.map(s => s.dispatch);
  }

  /** dispatches to cover the internal layers after the source layer is reduced */
  @reactively private get layerReductions(): number[] {
    const reductionFactor = this.blockLength * this.actualWorkgroupLength;
    let reducedSize = Math.ceil(this.sourceElems / reductionFactor);
    const dispatches = [];
    while (reducedSize > 1) {
      reducedSize = Math.ceil(reducedSize / reductionFactor);
      dispatches.push(reducedSize);
    }
    return dispatches;
  }

  /** buffers for both source and layer reductions */
  @reactively private resultBuffers(): GPUBuffer[] {
    return [this.sourceReductionBuffer, ...this.layerReductionBuffers];
  }

  @reactively private get sourceReductionBuffer(): GPUBuffer {
    const sourceDispatches = this.sourceReductions.reduce((a, b) => a + b, 0);
    const sourceSize = sourceDispatches * this.template.outputElementSize;
    return this.createBuffer(sourceSize, `S${sourceDispatches}`);
  }

  @reactively private get layerReductionBuffers(): GPUBuffer[] {
    return this.layerReductions.map(dispatchSize => {
      const size = dispatchSize * this.template.outputElementSize;
      return this.createBuffer(size, `L${dispatchSize}`);
    });
  }

  private createBuffer(size: number, dispatchLabel: string): GPUBuffer {
    const buffer = this.device.createBuffer({
      label: `${this.label} bufferReduce ${dispatchLabel}`,
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  /** all dispatches use the same pipeline */
  @reactively private pipeline(): GPUComputePipeline {
    return getBufferReducePipeline(
      {
        device: this.device,
        workgroupThreads: this.actualWorkgroupLength,
        blockArea: this.blockLength,
        reduceTemplate: this.template,
      },
      this.pipelineCache
    );
  }

  /** * One bind group for all source reductions,
   * (but we'll dispatch with dynamic offsets to point at
   * different parts of the uniform buffer) */
  @reactively private get sourceBindGroup(): GPUBindGroup {
    return this.createBindGroup(
      this.uniforms,
      this.source,
      this.sourceReductionBuffer,
      "source"
    );
  }

  @reactively private get layerBindGroups(): GPUBindGroup[] {
    let srcElems = this.sourceElems;
    let srcBuf = this.sourceReductionBuffer;
    const uniforms = this.uniforms;
    // chain source -> result1 -> result2 -> ...
    return this.layerReductionBuffers.map(resultBuf => {
      const resultElems = resultBuf.size / this.template.outputElementSize;
      const bindLabel = `${srcElems}`;
      const bindGroup = this.createBindGroup(uniforms, srcBuf, resultBuf, bindLabel);
      srcElems = resultElems;
      srcBuf = resultBuf;
      return bindGroup;
    });
  }

  private createBindGroup(
    uniforms: GPUBuffer,
    src: GPUBuffer,
    result: GPUBuffer,
    bindLabel: string
  ): GPUBindGroup {
    const uniformSlice = this.inputSlicing.uniformsSliceSize;
    return this.device.createBindGroup({
      label: `${this.label} bufferReduce ${bindLabel}`,
      layout: this.pipeline().getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniforms, size: uniformSlice } },
        { binding: 1, resource: { buffer: src } },
        { binding: 2, resource: { buffer: result } },
        { binding: 11, resource: { buffer: this.debugBuffer } },
      ],
    });
  }

  @reactively private get uniforms(): GPUBuffer {
    const uniforms = this.device.createBuffer({
      label: `${this.label} bufferReduce uniforms`,
      size: this.inputSlicing.uniformsBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    reactiveTrackUse(uniforms, this.usageContext);
    return uniforms;
  }

  @reactively private writeUniforms(): void {
    this.inputSlicing.slices.forEach((slice, i) => {
      const resultOffset = i * this.template.outputElementSize;
      const data = new Uint32Array([this.sourceOffset + slice.offset, resultOffset]);
      this.device.queue.writeBuffer(this.uniforms, slice.uniformOffset, data);
    });
  }

  @reactively private get actualWorkgroupLength(): number {
    const { device } = this;
    const workgroupLength = this.workgroupLength;
    const maxThreads = device.limits.maxComputeInvocationsPerWorkgroup;
    if (!workgroupLength || workgroupLength > maxThreads) {
      return maxThreads;
    } else {
      return workgroupLength;
    }
  }

  @reactively private get sourceElems(): number {
    return this.source.size / this.template.inputElementSize - this.sourceOffset;
  }

  @reactively private get actualMaxWorkgroups(): number {
    return this.maxWorkgroups ?? this.device.limits.maxComputeWorkgroupsPerDimension;
  }
}
