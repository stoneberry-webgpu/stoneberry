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
import { HistogramTemplate } from "./../util/HistogramTemplate";
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

  /** {@inheritDoc HistogramTexture#reduceTemplate} */
  histogramTemplate: HistogramTemplate;

  /** {@inheritDoc HistogramTexture#minMaxBuffer} */
  minMaxBuffer?: GPUBuffer;

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
  bufferBlockLength: undefined,
  loadComponent: "r",
  forceWorkgroupSize: undefined,
  pipelineCache: undefined,
  label: "",
  minMaxBuffer: undefined,
  range: [0, 100],
};

export class HistogramTexture extends HasReactive implements ComposableShader {
  @reactively source!: GPUTexture;

  /** length of block to read per thread when reading from the source texture */
  @reactively blockSize!: Vec2;

  /** number of histograms to read per thread when reducing from buffer to buffer */
  @reactively bufferBlockLength!: number | undefined;

  /** number and arrangement of threads in each dispatched workgroup */
  @reactively forceWorkgroupSize!: Vec2 | undefined;

  /** wgsl macros for histogram reduction and histogram size */
  @reactively histogramTemplate!: HistogramTemplate;

  /** macros to select or synthesize a component from the source texture */
  @reactively loadComponent!: LoadableComponent | LoadTemplate;

  /** buffer containing min and max values for the histogram range */
  @reactively minMaxBuffer?: GPUBuffer;

  /** range of histogram values (or provide minMaxBuffer) */
  @reactively range?: Vec2;

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
   * @returns a single reduced result value in an array
   */
  @reactively async histogram(): Promise<number[]> {
    return runAndFetchResult(this, "u32", `${this.label} histogram`);
  }

  /** result of the final reduction pass, one element in size */
  @reactively get result(): GPUBuffer {
    if (this.reduceBufferNeeded) {
      return this.reduceBuffer.result;
    } else {
      return this.textureToHistograms.histogramsResult;
    }
  }

  @reactively private get rangeBuffer(): GPUBuffer {
    if (this.minMaxBuffer) {
      return this.minMaxBuffer;
    } else if (this.range) {
      const buffer = this.device.createBuffer({
        label: "histogram range buffer",
        size: Uint32Array.BYTES_PER_ELEMENT * 2,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
      });

      let data: Uint32Array | Float32Array;
      if (this.histogramTemplate.outputElements === "f32") {
        data = new Float32Array(buffer.getMappedRange());
      } else {
        data = new Uint32Array(buffer.getMappedRange());
      }
      data[0] = this.range[0];
      data[1] = this.range[1];
      buffer.unmap();

      return buffer;
    } else {
      throw new Error("range or minMaxBuffer must be provided");
    }
  }

  /** all shaders needed to reduce the texture to a single reduced value */
  @reactively private get shaders(): ComposableShader[] {
    if (this.reduceBufferNeeded) {
      return [this.textureToHistograms, this.reduceBuffer];
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
    });
    reactiveTrackUse(shader, this.usageContext);
    return shader;
  }

  /** created only if necessary, a shader to reduce the buffer to a single element */
  @reactively private get reduceBuffer(): ReduceBuffer {
    const ws = this.forceWorkgroupSize;
    const workgroupLength = ws ? ws[0] * ws[1] : undefined;
    const shader = new ReduceBuffer({
      device: this.device,
      source: () => this.textureToHistograms.histogramsResult,
      forceWorkgroupLength: workgroupLength,
      label: this.label,
      blockLength: this.bufferBlockLength,
      pipelineCache: this.pipelineCache,
      template: this.histogramTemplate,
    });
    reactiveTrackUse(shader, this.usageContext);

    return shader;
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
