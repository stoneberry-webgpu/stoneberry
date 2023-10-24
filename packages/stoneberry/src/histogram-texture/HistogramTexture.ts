import { HasReactive, reactively } from "@reactively/decorate";
import {
  Cache,
  ComposableShader,
  ValueOrFn,
  Vec2,
  assignParams,
  reactiveTrackUse,
  trackContext,
} from "thimbleberry";
import { ReduceBuffer } from "../reduce-buffer/ReduceBuffer.js";
import {
  LoadTemplate,
  LoadableComponent,
  loaderForComponent,
} from "../util/LoadTemplate.js";
import { runAndFetchResult } from "../util/RunAndFetch.js";
import { HistogramTemplate, makeHistogramTemplate } from "./../util/HistogramTemplate";
import { TextureToHistograms } from "./TextureToHistograms.js";

export interface HistogramTextureParams {
  device: GPUDevice;

  /**
   * Source data to be reduced.
   *
   * A function returning the source buffer will be executed lazily,
   * and reexecuted if the function's `@reactively` source values change.
   */
  source: ValueOrFn<GPUTexture>;

  /** {@inheritDoc HistogramTexture#blockSize} */
  blockSize?: Vec2;

  /** {@inheritDoc HistogramTexture#bufferBlockLength} */
  bufferBlockLength?: number;

  /** {@inheritDoc HistogramTexture#forceWorkgroupSize} */
  forceWorkgroupSize?: Vec2;

  /** {@inheritDoc HistogramTexture#histogramTemplate} */
  histogramTemplate: HistogramTemplate;

  /** {@inheritDoc HistogramTexture#minMaxBuffer} */
  minMaxBuffer?: GPUBuffer;

  /** {@inheritDoc HistogramTexture#bucketSums} */
  bucketSums?: boolean;

  /** {@inheritDoc HistogramTexture#range} */
  range?: Vec2;

  /** load r, g, b, or a, or custom function */
  loadComponent?: LoadableComponent | LoadTemplate;

  /** cache for GPUComputePipeline */
  pipelineCache?: <T extends object>() => Cache<T>;

  /** {@inheritDoc HistogramTexture#label} */
  label?: string;
}

const defaults: Partial<HistogramTextureParams> = {
  blockSize: [4, 4],
  bufferBlockLength: 8,
  loadComponent: "r",
  forceWorkgroupSize: undefined,
  pipelineCache: undefined,
  label: "",
  minMaxBuffer: undefined,
  bucketSums: false,
  range: [0, 100],
};

/**
 * Calculate a histogram from a source texture.
 *
 * Internally, a cascade of shaders is run: the first shader calculates a separate
 * histogram for each part of the screen, and then a series of reduction shaders
 * combine the partial histograms.
 *
 * The number of buckets in the histogram is configurable.
 *
 * The range of values to spread across the buckets is also configurable.
 * The range may be specified by the cpu, or dynamically provided
 * some other shader writing to a two element GPUBuffer.
 *
 * Optionally, the sum for each bucket can also collected in parallel with the
 * frequency counts in the histogram. The sums are reported in a separate buffer.
 */
export class HistogramTexture extends HasReactive implements ComposableShader {
  @reactively source!: GPUTexture;

  /** length of block to read per thread when reading from the source texture */
  @reactively blockSize!: Vec2;

  /** number of histograms to read per thread when reducing from buffer to buffer */
  @reactively bufferBlockLength!: number | undefined;

  /** wgsl macros for histogram reduction and histogram size.
   * Typically call `makeHistogramTemplate()`
   */
  @reactively histogramTemplate!: HistogramTemplate;

  /** macros to select or synthesize a component from the source texture 
   * @defaultValue "r"
  */
  @reactively loadComponent!: LoadableComponent | LoadTemplate;

  /** range of histogram values (or provide minMaxBuffer) */
  @reactively range?: Vec2;

  /** buffer containing min and max values for the histogram range (or use range) */
  @reactively minMaxBuffer?: GPUBuffer;

  /** Override to set compute workgroup size e.g. for testing. 
    @defaultValue maxComputeInvocationsPerWorkgroup of the `GPUDevice` (256)
    */
  @reactively forceWorkgroupSize!: Vec2 | undefined;

  /** optinally calculate sums for each bucket in addition to counts 
   * @defaultValue false
  */
  @reactively bucketSums!: boolean;

  /** Debug label attached to gpu objects for error reporting */
  @reactively label?: string;

  device!: GPUDevice;
  private usageContext = trackContext();
  private pipelineCache?: <T extends object>() => Cache<T>;

  constructor(params: HistogramTextureParams) {
    super();
    assignParams<HistogramTexture>(this, params, defaults);
  }

  commands(commandEncoder: GPUCommandEncoder): void {
    this.shaders.forEach(s => s.commands(commandEncoder));
  }

  destroy(): void {
    this.usageContext.finish();
  }

  /** Execute the histogram immediately and copy the results back to the CPU.
   * (results are copied from the {@link HistogramTexture.result} GPUBuffer)
   * 
   * To use HistogramTexture in concert with external shaders, 
   * instead use {@link HistogramTexture.commands} or `ShaderGroup`.
   * 
   * @returns a single histogram in an array
   */
  @reactively async histogram(): Promise<number[]> {
    return runAndFetchResult(this, "u32", `${this.label} histogram`);
  }

  /** accumulated histogram (frequency counts) */
  @reactively get result(): GPUBuffer {
    if (this.reduceBufferNeeded) {
      return this.reduceBucketCounts.result;
    } else {
      return this.textureToHistograms.histogramsResult;
    }
  }

  /** accumulated bucket counts, only valid if `bucketSums` is true */
  @reactively get sumsResult(): GPUBuffer {
    if (this.reduceBufferNeeded) {
      return this.reduceSumCounts.result;
    } else {
      return this.textureToHistograms.sumsResult;
    }
  }

  /** create a range buffer if necessary */
  @reactively private get rangeBuffer(): GPUBuffer {
    if (this.minMaxBuffer) {
      return this.minMaxBuffer;
    } else if (this.range) {
      // if no minMax buffer is provided, make our own
      const elems = 2;
      const buffer = this.createdRangeBuffer;

      let data: Uint32Array | Float32Array;
      if (this.histogramTemplate.outputElements === "f32") {
        data = new Float32Array(elems);
      } else {
        data = new Uint32Array(elems);
      }
      data[0] = this.range[0];
      data[1] = this.range[1];
      this.device.queue.writeBuffer(buffer, 0, data);

      return buffer;
    } else {
      throw new Error("range or minMaxBuffer must be provided");
    }
  }

  /** create a buffer to hold the range values */
  @reactively private get createdRangeBuffer(): GPUBuffer {
    const buffer = this.device.createBuffer({
      label: "histogram range buffer",
      size: Uint32Array.BYTES_PER_ELEMENT * 2,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  /** all shaders needed to reduce the texture to a single reduced value */
  @reactively private get shaders(): ComposableShader[] {
    if (this.reduceBufferNeeded) {
      const sums = this.bucketSums ? [this.reduceSumCounts] : [];
      return [this.textureToHistograms, this.reduceBucketCounts, ...sums];
    } else {
      return [this.textureToHistograms];
    }
  }

  /** shader to reduce the texture to a buffer */
  @reactively private get textureToHistograms(): TextureToHistograms {
    const shader = new TextureToHistograms({
      device: this.device,
      source: () => this.source,
      blockSize: this.blockSize,
      forceWorkgroupSize: this.forceWorkgroupSize,
      histogramTemplate: this.histogramTemplate,
      loadTemplate: this.loadTemplate,
      pipelineCache: this.pipelineCache,
      label: this.label,
      minMaxBuffer: this.rangeBuffer,
      bucketSums: this.bucketSums,
    });
    reactiveTrackUse(shader, this.usageContext);
    return shader;
  }

  /** created only if necessary, a shader to reduce the histograms buffer to a single element */
  @reactively private get reduceBucketCounts(): ReduceBuffer {
    const ws = this.forceWorkgroupSize;
    const workgroupLength = ws ? ws[0] * ws[1] : undefined;
    const shader = new ReduceBuffer({
      device: this.device,
      source: () => this.textureToHistograms.histogramsResult,
      forceWorkgroupLength: workgroupLength,
      label: this.label,
      blockLength: this.bufferBlockLength,
      pipelineCache: this.pipelineCache,
      template: this.reduceCountsTemplate,
    });
    reactiveTrackUse(shader, this.usageContext);

    return shader;
  }

  /** created only if necessary, a shader to reduce the histograms buffer to a single element */
  @reactively private get reduceSumCounts(): ReduceBuffer {
    const ws = this.forceWorkgroupSize;
    const workgroupLength = ws ? ws[0] * ws[1] : undefined;
    const shader = new ReduceBuffer({
      device: this.device,
      source: () => this.textureToHistograms.sumsResult,
      forceWorkgroupLength: workgroupLength,
      label: this.label,
      blockLength: this.bufferBlockLength,
      pipelineCache: this.pipelineCache,
      template: this.histogramTemplate,
    });
    reactiveTrackUse(shader, this.usageContext);

    return shader;
  }

  // histogram counts are always u32, make sure reduction template is u32
  @reactively private get reduceCountsTemplate(): HistogramTemplate {
    const texTemplate = this.histogramTemplate;
    if (texTemplate.outputElements === "u32") {
      return texTemplate;
    } else {
      return makeHistogramTemplate(texTemplate.buckets, "u32");
    }
  }

  @reactively private get reduceBufferNeeded(): boolean {
    return this.textureToHistograms.resultElems > 1;
  }

  /** reduction template for loading src data from the texture */
  @reactively private get loadTemplate(): LoadTemplate {
    if (typeof this.loadComponent === "string") {
      return loaderForComponent(this.loadComponent);
    } else {
      return this.loadComponent;
    }
  }
}
