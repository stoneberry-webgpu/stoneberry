import { HasReactive, reactively } from "@reactively/decorate";
import deepEqual from "fast-deep-equal";
import {
  Cache,
  ComposableShader,
  ValueOrFn,
  Vec2,
  assignParams,
  createDebugBuffer,
  gpuTiming,
  reactiveTrackUse,
  trackContext,
} from "thimbleberry";
import { HistogramTemplate } from "../util/HistogramTemplate.js";
import { maxWorkgroupSize } from "../util/LimitWorkgroupSize.js";
import { LoadTemplate, loadRedComponent } from "../util/LoadTemplate.js";
import { getTextureToHistogramsPipeline } from "./TextureToHistogramsPipeline.js";

export interface TextureToHistogramsParams {
  device: GPUDevice;
  /**
   * Source data to be bucketed in a histogram
   *
   * A function returning the source buffer will be executed lazily,
   * and reexecuted if the function's `@reactively` source values change.
   */
  source: ValueOrFn<GPUTexture>;

  /**
   * range of values
   *
   * A function returning the source buffer will be executed lazily,
   * and reexecuted if the function's `@reactively` source values change.
   */
  minMaxBuffer: ValueOrFn<GPUBuffer>;

  /** {@inheritDoc TextureToHistograms#histogramTemplate} */
  histogramTemplate: HistogramTemplate;

  /** {@inheritDoc TextureToHistograms#blockSize} */
  blockSize?: Vec2;

  /** {@inheritDoc TextureToHistograms#forceWorkgroupSize} */
  forceWorkgroupSize?: Vec2;

  /** {@inheritDoc TextureToHistograms#loadTemplate} */
  loadTemplate?: LoadTemplate;

  /** cache for GPUComputePipeline */
  pipelineCache?: <T extends object>() => Cache<T>;

  /** {@inheritDoc TextureToHistograms#bucketSums} */
  bucketSums?: boolean;

  /** {@inheritDoc TextureToHistograms#saturateMax} */
  saturateMax?: boolean;

  /** {@inheritDoc TextureToHistograms#label} */
  label?: string;
}

const defaults: Partial<TextureToHistogramsParams> = {
  blockSize: [4, 4],
  forceWorkgroupSize: undefined,
  pipelineCache: undefined,
  loadTemplate: loadRedComponent,
  bucketSums: false,
  saturateMax: false,
  label: "",
};

/** calc histograms from gpu texture
 * Each workgroup thread reads a blockSize group of elements to one histogram,
 * and each dispatch reduces the workgroup histograms to one histogram.
 * The result is a buffer of histograms, one per dispatched workgroup.
 * (The resulting histogram buffer should be reduced to one histogram via ReduceBuffer)
 */
export class TextureToHistograms extends HasReactive implements ComposableShader {
  /** Source texture to be counted in a histogram */
  @reactively source!: GPUTexture;

  /** range of values to consider in histogram */
  @reactively minMaxBuffer!: GPUBuffer;

  /** macros to customize wgsl shader for size of data and size of histogram */
  @reactively histogramTemplate!: HistogramTemplate;

  /** macros to select component from vec4 */
  @reactively loadTemplate!: LoadTemplate;

  /** calculate sums for each bucket */
  @reactively bucketSums!: boolean;

  /** include values > max range in last bucket */
  @reactively saturateMax!: boolean;

  /** Debug label attached to gpu objects for error reporting */
  @reactively label?: string;

  /** number of elements to reduce in each invocation (4) */
  @reactively({ equals: deepEqual }) blockSize!: Vec2;

  /** Override to set compute workgroup size e.g. for testing. */
  @reactively({ equals: deepEqual }) forceWorkgroupSize!: Vec2;

  private device!: GPUDevice;
  private pipelineCache?: <T extends object>() => Cache<T>;
  private usageContext = trackContext();

  constructor(params: TextureToHistogramsParams) {
    super();

    assignParams<TextureToHistograms>(this, params, defaults);
  }

  commands(commandEncoder: GPUCommandEncoder): void {
    const dispatchSize = this.dispatchSize;
    const timestampWrites = gpuTiming?.timestampWrites("TextureToHistograms");
    const passEncoder = commandEncoder.beginComputePass({ timestampWrites });
    passEncoder.label = "histogram pass";
    passEncoder.setPipeline(this.pipeline());
    passEncoder.setBindGroup(0, this.bindGroup());
    passEncoder.dispatchWorkgroups(dispatchSize[0], dispatchSize[1]);
    passEncoder.end();
  }

  destroy(): void {
    this.usageContext.finish();
  }

  /** histogram bucket counts */
  @reactively get histogramsResult(): GPUBuffer {
    const size = this.resultElems * this.histogramTemplate.outputElementSize;
    const buffer = this.device.createBuffer({
      label: "texture histograms counts",
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    return buffer;
  }

  /** histogram bucket sums */
  @reactively get sumsResult(): GPUBuffer {
    if (!this.bucketSums) {
      console.error("sumsResult requested but bucketSums is false");
    }
    const size = this.resultElems * this.histogramTemplate.outputElementSize;
    const buffer = this.device.createBuffer({
      label: "texture histograms sums",
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    return buffer;
  }

  /** number of elements in the result buffer */
  @reactively get resultElems(): number {
    const [x, y] = this.dispatchSize;
    return x * y;
  }

  @reactively get debugBuffer(): GPUBuffer {
    const buffer = createDebugBuffer(this.device, "TextureToHistograms debug");
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively private pipeline(): GPUComputePipeline {
    return getTextureToHistogramsPipeline(
      {
        device: this.device,
        workgroupSize: this.workgroupSize,
        blockSize: this.blockSize,
        histogramTemplate: this.histogramTemplate,
        loadTemplate: this.loadTemplate,
        textureFormat: this.source.format,
        bucketSums: this.bucketSums,
        saturateMax: this.saturateMax,
      },
      this.pipelineCache
    );
  }

  @reactively private get uniformBuffer(): GPUBuffer {
    const buffer = this.device.createBuffer({
      label: "texture histograms uniform buffer",
      size: 4 * 4,
      usage: GPUBufferUsage.UNIFORM,
    });
    reactiveTrackUse(buffer, this.usageContext); // currently unused
    return buffer;
  }

  @reactively private get dispatchSize(): Vec2 {
    const workSize = this.workgroupSize;
    const srcSize = [this.source.width, this.source.height];
    const blockSize = this.blockSize;

    return srcSize.map((s, i) => Math.ceil(s / (blockSize[i] * workSize[i]))) as Vec2;
  }

  @reactively private get workgroupSize(): Vec2 {
    const limits = this.device.limits;
    if (this.forceWorkgroupSize) {
      return this.forceWorkgroupSize;
    } else {
      return maxWorkgroupSize(limits);
    }
  }

  @reactively private bindGroup(): GPUBindGroup {
    const srcView = this.source.createView({ label: "texture histograms src view" });
    const sumsBinding: GPUBindGroupEntry[] = this.bucketSums
      ? [{ binding: 4, resource: { buffer: this.sumsResult } }]
      : [];
    return this.device.createBindGroup({
      label: "textureHistograms binding",
      layout: this.pipeline().getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: srcView },
        { binding: 2, resource: { buffer: this.minMaxBuffer } },
        ...sumsBinding,
        { binding: 3, resource: { buffer: this.histogramsResult } },
        { binding: 11, resource: { buffer: this.debugBuffer } },
      ],
    });
  }
}
