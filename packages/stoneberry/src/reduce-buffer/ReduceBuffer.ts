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
} from "thimbleberry";
import { ModuleRegistry } from "wgsl-linker";
import { BinOpModule } from "../util/BinOpModules.js";
import { computePipeline } from "../util/ComputePipeline.js";
import { SlicingResults, inputSlicing } from "../util/InputSlicing.js";
import { runAndFetchResult } from "../util/RunAndFetch.js";
import wgsl from "./ReduceBuffer.wgsl?raw";
import reduceWorkgroup from "./reduceWorkgroup.wgsl?raw";

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

  /** {@inheritDoc ReduceBuffer#forceWorkgroupLength} */
  forceWorkgroupLength?: number;

  /** {@inheritDoc ReduceBuffer#forceMaxWorkgroups} */
  forceMaxWorkgroups?: number | undefined;

  /** {@inheritDoc ReduceBuffer#binOps} */
  binOps: BinOpModule;

  /** cache for GPUComputePipeline */
  pipelineCache?: <T extends object>() => Cache<T>;

  /** {@inheritDoc ReduceBuffer#label} */
  label?: string;
}

const defaults: Partial<BufferReduceParams> = {
  blockLength: 4,
  sourceOffset: 0,
  resultOffset: 0,
  forceWorkgroupLength: undefined,
  forceMaxWorkgroups: undefined,
  label: "",
};

/**
 * Reduce a buffer of data to a single value by running an associative
 * binary operation over every element.
 *
 * The binary operation is specified by a BinOpModule. Possible binary
 * operations include sum, min, and max.
 */
export class ReduceBuffer extends HasReactive implements ComposableShader {
  /** Source data to be reduced */
  @reactively source!: GPUBuffer;

  /** macros to customize wgsl shader for size of data and type of reduce*/
  @reactively binOps!: BinOpModule;

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
  @reactively forceWorkgroupLength?: number;

  /** Override to set max number of workgroups for dispatch e.g. for testing. 
    @defaultValue maxComputeWorkgroupsPerDimension from the `GPUDevice` (65535)
    */
  @reactively forceMaxWorkgroups?: number;

  device!: GPUDevice;
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
      const dispatchLabel = `${dispatchSize} s${i}`;
      const offset = [inputSlices.slices[i].uniformOffset];
      this.encodePass(commandEncoder, sourceBind, dispatchSize, offset, dispatchLabel);
    });

    const layerBindGroups = this.layerBindGroups;
    this.layerReductions.forEach((dispatchSize, i) => {
      const bindGroup = layerBindGroups[i];
      const dispatchLabel = `${dispatchSize} l${i}`;
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
    passEncoder.setPipeline(this.pipeline);
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
    const format = this.binOps.outputElements!;
    return runAndFetchResult(this, format, `${this.label} reduceBuffer`);
  }

  /** Buffer containing results of the reduce after the shader has run. */
  @reactively get result(): GPUBuffer {
    return this.resultBuffers.slice(-1)[0];
  }

  @reactively get workgroupWGSL(): string {
    return "";
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
      elemsPerDispatch: this.workgroupLength * this.blockLength,
      maxDispatches: this.maxWorkgroups,
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
    const reductionFactor = this.blockLength * this.workgroupLength;
    let reducedSize = Math.ceil(this.sourceElems / reductionFactor);
    const dispatches = [];
    while (reducedSize > 1) {
      reducedSize = Math.ceil(reducedSize / reductionFactor);
      dispatches.push(reducedSize);
    }
    return dispatches;
  }

  /** buffers for both source and layer reductions */
  @reactively private get resultBuffers(): GPUBuffer[] {
    return [this.sourceReductionBuffer, ...this.layerReductionBuffers];
  }

  @reactively private get sourceReductionBuffer(): GPUBuffer {
    const sourceDispatches = this.sourceReductions.reduce((a, b) => a + b, 0);
    const sourceSize = sourceDispatches * this.binOps.outputElementSize;
    return this.createBuffer(sourceSize, `S${sourceDispatches}`);
  }

  @reactively private get layerReductionBuffers(): GPUBuffer[] {
    return this.layerReductions.map(dispatchSize => {
      const size = dispatchSize * this.binOps.outputElementSize;
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

  @reactively private get registry(): ModuleRegistry {
    return new ModuleRegistry(reduceWorkgroup, this.binOps.wgsl);
  }

  /** all dispatches use the same pipeline */
  @reactively private get pipeline(): GPUComputePipeline {
    const cp = computePipeline(
      {
        device: this.device,
        wgsl,
        wgslParams: {
          workgroupThreads: this.workgroupLength,
          blockArea: this.blockLength,
        },
        registry: this.registry,
        bindings: [
          { buffer: { type: "uniform", hasDynamicOffset: true } },
          { buffer: { type: "read-only-storage" } },
          { buffer: { type: "storage" } },
        ],
        debugBuffer: true,
      },
      this.pipelineCache
    );
    return cp.pipeline;
  }

  /** * One bind group for all source reductions,
   * (but we'll dispatch with dynamic offsets to point at
   * different parts of the uniform buffer) */
  @reactively private get sourceBindGroup(): GPUBindGroup {
    const resultBuf = this.sourceReductionBuffer;
    return this.createBindGroup(this.uniforms, this.source, resultBuf, "source");
  }

  @reactively private get layerBindGroups(): GPUBindGroup[] {
    let srcElems = this.sourceElems;
    let srcBuf = this.sourceReductionBuffer;
    const uniforms = this.uniforms;
    // chain source -> result1 -> result2 -> ...
    return this.layerReductionBuffers.map(resultBuf => {
      const resultElems = resultBuf.size / this.binOps.outputElementSize;
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
      layout: this.pipeline.getBindGroupLayout(0),
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
    const resultOffsets = this.resultOffsets;
    this.inputSlicing.slices.forEach((slice, i) => {
      const data = new Uint32Array([this.sourceOffset + slice.offset, resultOffsets[i]]);
      this.device.queue.writeBuffer(this.uniforms, slice.uniformOffset, data);
    });
  }

  /** offsets into the result buffer for a sliced first layer multi-dispatch */
  @reactively private get resultOffsets(): number[] {
    let offset = 0;
    return this.inputSlicing.slices.map(s => {
      const result = offset;
      offset += s.dispatch; // each dispatched workgroup produces one result item
      return result;
    });
  }

  @reactively private get workgroupLength(): number {
    const { device } = this;
    const proposedLength = this.forceWorkgroupLength;

    // limit on threads based on workgroup storage required
    const storageMaxThreads = Math.floor(
      device.limits.maxComputeWorkgroupStorageSize / this.binOps.outputElementSize
    );
    // also limit by max threads per workgroup
    const maxThreads = Math.min(
      device.limits.maxComputeInvocationsPerWorkgroup,
      storageMaxThreads
    );

    if (!proposedLength || proposedLength > maxThreads) {
      return maxThreads;
    } else {
      return proposedLength;
    }
  }

  @reactively private get sourceElems(): number {
    return this.source.size / this.binOps.inputElementSize - this.sourceOffset;
  }

  @reactively private get maxWorkgroups(): number {
    return this.forceMaxWorkgroups ?? this.device.limits.maxComputeWorkgroupsPerDimension;
  }
}
