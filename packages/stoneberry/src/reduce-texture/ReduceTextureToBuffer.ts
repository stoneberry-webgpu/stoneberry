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
import { ModuleRegistry } from "wgsl-linker";
import reduceWorkgroup from "../reduce-buffer/reduceWorkgroup.wgsl?raw";
import { BinOpTemplate2 } from "../util/BinOpModules.js";
import { computePipeline } from "../util/ComputePipeline.js";
import { maxWorkgroupSize } from "../util/LimitWorkgroupSize.js";
import { ComponentName, LoadComponent } from "../util/LoadTemplate.js";
import wgsl from "./ReduceTexture.wgsl?raw";

export interface TextureToBufferParams {
  device: GPUDevice;
  /**
   * Source data to be reduced.
   *
   * A function returning the source buffer will be executed lazily,
   * and reexecuted if the function's `@reactively` source values change.
   */
  source: ValueOrFn<GPUTexture>;

  /** {@inheritDoc ReduceTextureToBuffer#reduceTemplate} */
  reduceTemplate: BinOpTemplate2;

  /** {@inheritDoc ReduceTextureToBuffer#blockSize} */
  blockSize?: Vec2;

  /** {@inheritDoc ReduceTextureToBuffer#forceWorkgroupSize} */
  forceWorkgroupSize?: Vec2;

  /** {@inheritDoc ReduceTextureToBuffer#loadComponent} */
  loadComponent?: LoadComponent;

  /** {@inheritDoc ReduceTextureToBuffer#componentName} */
  componentName?: ComponentName;

  /** cache for GPUComputePipeline */
  pipelineCache?: <T extends object>() => Cache<T>;

  /** {@inheritDoc ReduceTextureToBuffer#label} */
  label?: string;
}

const defaults: Partial<TextureToBufferParams> = {
  blockSize: [4, 4],
  forceWorkgroupSize: undefined,
  pipelineCache: undefined,
  label: "",
  componentName: "r",
};

/** reduce a gpu texture to a buffer by running binary operations over elements.
 * Each workgroup thread reduces a blockSize group of elements to one element,
 * and each dispatch reduces the workgroup elements to one element.
 */
export class ReduceTextureToBuffer extends HasReactive implements ComposableShader {
  /** Source texture to be reduced */
  @reactively source!: GPUTexture;

  /** macros to customize wgsl shader for size of data and type of reduce*/
  @reactively reduceTemplate!: BinOpTemplate2;

  /** macros to select component from vec4 */
  @reactively loadComponent!: LoadComponent;

  /** select r, g, b, a*/
  @reactively componentName!: ComponentName;

  /** Debug label attached to gpu objects for error reporting */
  @reactively label?: string;

  /** number of elements to reduce in each invocation (4) */
  @reactively({ equals: deepEqual }) blockSize!: Vec2;

  /** Override to set compute workgroup size e.g. for testing. */
  @reactively({ equals: deepEqual }) forceWorkgroupSize!: Vec2;

  private device!: GPUDevice;
  private pipelineCache?: <T extends object>() => Cache<T>;
  private usageContext = trackContext();

  constructor(params: TextureToBufferParams) {
    super();

    assignParams<ReduceTextureToBuffer>(this, params, defaults);
  }

  commands(commandEncoder: GPUCommandEncoder): void {
    const timestampWrites = gpuTiming?.timestampWrites("reduceTextureToBuffer");
    const passEncoder = commandEncoder.beginComputePass({ timestampWrites });
    passEncoder.label = "textureReduce pass";
    passEncoder.setPipeline(this.pipeline());
    passEncoder.setBindGroup(0, this.bindGroup());
    passEncoder.dispatchWorkgroups(this.dispatchSize[0], this.dispatchSize[1]);
    passEncoder.end();
  }

  destroy(): void {
    this.usageContext.finish();
  }

  /** results of the reduction from frame to service */
  @reactively get reducedResult(): GPUBuffer {
    const size = this.resultElems * this.reduceTemplate.outputElementSize;
    const buffer = this.device.createBuffer({
      label: "texture reduce result buffer",
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
    const buffer = createDebugBuffer(this.device, "TextureReduce debug");
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively private get sampleType(): GPUTextureSampleType {
    return textureSampleType(this.source.format);
  }

  @reactively private get registry(): ModuleRegistry {
    const registry = new ModuleRegistry(reduceWorkgroup, this.reduceTemplate.wgsl);
    const loadWgsl = this.loadComponent;
    if (loadWgsl.kind === "template") {
      registry.registerModules(loadWgsl.wgsl);
    } else {
      registry.registerGenerator(
        "loadTexel",
        loadWgsl.fn,
        ["Output", "texelType"],
        "ReduceTextureToBuffer"
      );
    }
    return registry;
  }

  @reactively private pipeline(): GPUComputePipeline {
    const workgroupSize = this.workgroupSize;
    const blockSize = this.blockSize;
    const compute = computePipeline(
      {
        label: "textureReduce",
        device: this.device,
        wgsl,
        wgslParams: {
          texelType: texelLoadType(this.source.format),
          loadComponentName: this.componentName,
          workgroupThreads: workgroupSize[0] * workgroupSize[1],
          blockWidth: blockSize[0],
          blockHeight: blockSize[1],
          blockArea: blockSize[0] * blockSize[1],
          ...this.reduceTemplate,
          ...this.loadComponent,
        },
        registry: this.registry,
        constants: {
          workgroupThreads: workgroupSize[0] * workgroupSize[1],
          workgroupSizeX: workgroupSize[0],
          workgroupSizeY: workgroupSize[1],
        },
        bindings: [
          { buffer: { type: "uniform" } },
          { texture: { sampleType: this.sampleType } },
          { buffer: { type: "storage" } },
        ],
        debugBuffer: true,
      },
      this.pipelineCache
    );
    return compute.pipeline;
  }

  @reactively private get uniformBuffer(): GPUBuffer {
    const buffer = this.device.createBuffer({
      label: "texture reduce uniform buffer",
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
    const srcView = this.source.createView({ label: "texture reduce src view" });
    return this.device.createBindGroup({
      label: "textureReduce binding",
      layout: this.pipeline().getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: srcView },
        { binding: 2, resource: { buffer: this.reducedResult } },
        { binding: 11, resource: { buffer: this.debugBuffer } },
      ],
    });
  }
}
