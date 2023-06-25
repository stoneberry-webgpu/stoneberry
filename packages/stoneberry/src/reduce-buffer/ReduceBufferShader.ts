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
import { getBufferReducePipeline } from "./ReduceBufferPipeline";

export interface BufferReduceParams {
  device: GPUDevice;
  source: ValueOrFn<GPUBuffer>;
  result: ValueOrFn<GPUBuffer>;
  dispatchLength: ValueOrFn<number>;
  sourceStart?: ValueOrFn<number>;
  sourceEnd?: ValueOrFn<number>;
  blockLength?: ValueOrFn<number>;
  workgroupLength?: ValueOrFn<number>;
  template?: ValueOrFn<BinOpTemplate>;
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
  @reactively source!: GPUBuffer;
  @reactively result!: GPUBuffer;
  @reactively dispatchLength!: number;
  @reactively blockLength!: number;
  @reactively workgroupLength?: number;
  @reactively template!: BinOpTemplate;
  /** Debug label attached to gpu objects for error reporting */
  @reactively label?: string;

  private device!: GPUDevice;
  private usageContext = trackContext();
  private pipelineCache?: <T extends object>() => Cache<T>;

  constructor(params: BufferReduceParams) {
    super();
    assignParams<ReduceBuffer>(this, params, defaults);
  }

  commands(commandEncoder: GPUCommandEncoder): void {
    const bindGroup = this.bindGroup();

    const elems = this.source.size;
    const label = `bufferReduce ${elems}`;
    const timestampWrites = gpuTiming?.timestampWrites(label);
    const passEncoder = commandEncoder.beginComputePass({ timestampWrites });
    passEncoder.label = label;
    passEncoder.setPipeline(this.pipeline());
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(this.dispatchLength, 1, 1);
    passEncoder.end();
  }

  destroy(): void {
    this.usageContext.finish();
  }

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
    this.template.elementSize
    return [...data];
  }

  @reactively get debugBuffer(): GPUBuffer {
    const buffer = createDebugBuffer(this.device, "BufferReduce debug");
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
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

  @reactively private bindGroup(): GPUBindGroup {
    const srcSize = this.source.size;
    return this.device.createBindGroup({
      label: `bufferReduce ${srcSize}`,
      layout: this.pipeline().getBindGroupLayout(0),
      entries: [
        { binding: 1, resource: { buffer: this.source } },
        { binding: 2, resource: { buffer: this.result } },
        { binding: 11, resource: { buffer: this.debugBuffer } },
      ],
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
