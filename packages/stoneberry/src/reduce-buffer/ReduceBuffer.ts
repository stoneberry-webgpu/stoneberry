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
  sourceStart?: number;
  sourceEnd?: number;
  blockLength?: number;
  workgroupLength?: number;

  template?: BinOpTemplate;
  pipelineCache?: <T extends object>() => Cache<T>;

  /** {@inheritDoc ReduceBuffer#label} */
  label?: string;
}

const defaults: Partial<BufferReduceParams> = {
  blockLength: 4,
  sourceStart: 0,
  template: maxF32,
  workgroupLength: undefined,
  sourceEnd: undefined,
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

  /** number of elements to reduce in each invocation (4) */
  @reactively blockLength!: number;

  /** Override to set compute workgroup size e.g. for testing. 
    @defaultValue maxComputeInvocationsPerWorkgroup of the `GPUDevice`
    */
  @reactively workgroupLength?: number;

  /** Override to set max number of workgroups for dispatch e.g. for testing. 
    @defaultValue maxComputeWorkgroupsPerDimension from the `GPUDevice`
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
    const bindGroups = this.bindGroups();

    const elems = this.source.size;
    this.dispatchSizes.forEach((dispatchSize, i) => {
      const label = `${this.label} bufferReduce ${elems} #${i}`;
      const timestampWrites = gpuTiming?.timestampWrites(label);
      const passEncoder = commandEncoder.beginComputePass({ timestampWrites });
      passEncoder.label = label;
      passEncoder.setPipeline(this.pipeline());
      passEncoder.setBindGroup(0, bindGroups[i]);
      passEncoder.dispatchWorkgroups(dispatchSize, 1, 1);
      passEncoder.end();
    });
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

  /** number of workgroups dispatched for each phase of buffer reduce */
  @reactively private get dispatchSizes(): number[] {
    const { blockLength } = this;
    const dispatches = [];
    // TODO handle case where source buffer requires more dispatches than maxComputerWorkgroupPerDimension
    const reductionFactor = blockLength * this.actualWorkgroupLength();
    for (let reducedSize = this.sourceElems; reducedSize > 1; ) {
      reducedSize = Math.ceil(reducedSize / reductionFactor);
      dispatches.push(reducedSize);
    }

    return dispatches;
  }

  @reactively private resultBuffers(): GPUBuffer[] {
    return this.dispatchSizes.map(dispatchSize => {
      const size = dispatchSize * this.template.outputElementSize;
      const buffer = this.device.createBuffer({
        label: `${this.label} bufferReduce ${dispatchSize}`,
        size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
      reactiveTrackUse(buffer, this.usageContext);
      return buffer;
    });
  }

  @reactively private get sourceElems(): number {
    return this.source.size / this.template.inputElementSize;
  }

  @reactively private pipeline(): GPUComputePipeline {
    return getBufferReducePipeline(
      {
        device: this.device,
        workgroupThreads: this.actualWorkgroupLength(),
        blockArea: this.blockLength,
        reduceTemplate: this.template,
      },
      this.pipelineCache
    );
  }

  @reactively private bindGroups(): GPUBindGroup[] {
    let srcElems = this.sourceElems;
    let srcBuf = this.source;
    // chain source -> result1 -> result2 -> ...
    return this.resultBuffers().map(resultBuf => {
      const resultElems = resultBuf.size / this.template.outputElementSize;
      const bindGroup = this.device.createBindGroup({
        label: `${this.label} bufferReduce ${srcElems}`,
        layout: this.pipeline().getBindGroupLayout(0),
        entries: [
          { binding: 1, resource: { buffer: srcBuf } },
          { binding: 2, resource: { buffer: resultBuf } },
          { binding: 11, resource: { buffer: this.debugBuffer } },
        ],
      });
      srcElems = resultElems;
      srcBuf = resultBuf;
      return bindGroup;
    });
  }

  @reactively private actualWorkgroupLength(): number {
    const { device } = this;
    const workgroupLength = this.workgroupLength;
    const maxThreads = device.limits.maxComputeInvocationsPerWorkgroup;
    if (!workgroupLength || workgroupLength > maxThreads) {
      return maxThreads;
    } else {
      return workgroupLength;
    }
  }
}
