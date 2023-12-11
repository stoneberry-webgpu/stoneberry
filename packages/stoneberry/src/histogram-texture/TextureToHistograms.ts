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
  texelLoadType,
  textureSampleType,
  trackContext,
} from "thimbleberry";
import { computePipeline } from "../util/ComputePipeline.js";
import { HistogramModule } from "../util/HistogramModule.js";
import { maxWorkgroupSize } from "../util/LimitWorkgroupSize.js";
import { ComponentName, LoadComponent, texelLoader } from "../util/LoadTemplate.js";
import { BindingEntry } from "./../util/ComputePipeline";
import wgsl from "./TextureToHistograms.wgsl?raw";
import { ModuleRegistry } from "wgsl-linker";

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
  histogramTemplate: HistogramModule;

  /** {@inheritDoc TextureToHistograms#blockSize} */
  blockSize?: Vec2;

  /** {@inheritDoc TextureToHistograms#forceWorkgroupSize} */
  forceWorkgroupSize?: Vec2;

  /** {@inheritDoc TextureToHistograms#sourceComponent} */
  sourceComponent?: ComponentName | LoadComponent;

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
  sourceComponent: "r",
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
  @reactively histogramTemplate!: HistogramModule;

  /** select or synthesize a component (e.g. r,g,b,a) from the source texture */
  @reactively sourceComponent!: ComponentName | LoadComponent;

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
  @reactively private get registry(): ModuleRegistry {
    const registry = new ModuleRegistry();
    const loadWgsl = texelLoader(this.sourceComponent);
    if (loadWgsl.kind === "template") {
      registry.registerModules(loadWgsl.wgsl);
    } else {
      registry.registerGenerator(
        "loadTexel",
        loadWgsl.fn,
        ["Output", "texelType"],
        "TextureToHistograms"
      );
    }
    return registry;
  }

  @reactively private pipeline(): GPUComputePipeline {
    const sumsBinding: BindingEntry[] = this.bucketSums
      ? [{ buffer: { type: "storage" } }]
      : [];

    const blockSize = this.blockSize;
    const compute = computePipeline(
      {
        device: this.device,
        wgsl,
        registry: this.registry,
        wgslParams: {
          texelType: texelLoadType(this.source.format),
          blockWidth: blockSize[0],
          blockHeight: blockSize[1],
          blockArea: blockSize[0] * blockSize[1],
          bucketSums: this.bucketSums,
          saturateMax: this.saturateMax,
          floatElements: this.histogramTemplate.outputElements === "f32",
          ...this.histogramTemplate, // TODO do we need all this?
          inputElements: this.histogramTemplate.outputElements,
        },
        constants: {
          workgroupSizeX: this.workgroupSize[0],
          workgroupSizeY: this.workgroupSize[1],
          numBuckets: this.histogramTemplate.buckets,
        },
        bindings: [
          { buffer: { type: "uniform" } },
          { texture: { sampleType: textureSampleType(this.source.format) } },
          { buffer: { type: "read-only-storage" } },
          { buffer: { type: "storage" } },
          ...sumsBinding,
        ],
        debugBuffer: true,
      },
      this.pipelineCache
    );
    return compute.pipeline;
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
