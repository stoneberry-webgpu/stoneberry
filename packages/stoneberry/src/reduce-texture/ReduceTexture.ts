import { HasReactive, reactively } from "@reactively/decorate";
import deepEqual from "fast-deep-equal";
import {
  Cache,
  ComposableShader,
  ValueOrFn,
  Vec2,
  assignParams,
  reactiveTrackUse,
  trackContext,
} from "thimbleberry";
import { BinOpTemplate, maxF32 } from "../util/BinOpTemplate.js";
import {
  LoadTemplate,
  LoadableComponent,
  loaderForComponent,
} from "../util/LoadTemplate.js";
import { ReduceTextureToBuffer } from "./ReduceTextureToBuffer.js";
import { ReduceBuffer } from "../reduce-buffer/ReduceBuffer.js";

export interface ReduceTextureParams {
  device: GPUDevice;

  /**
   * Source data to be reduced.
   *
   * A function returning the source buffer will be executed lazily,
   * and reexecuted if the function's `@reactively` source values change.
   */
  source: ValueOrFn<GPUTexture>;

  /** {@inheritDoc ReduceTexture#blockSize} */
  blockSize?: Vec2;

  /** {@inheritDoc ReduceTexture#bufferBlockLength} */
  bufferBlockLength?: number;

  /** {@inheritDoc ReduceTexture#workgroupSize} */
  workgroupSize?: Vec2;

  /** {@inheritDoc ReduceTexture#reduceTemplate} */
  reduceTemplate?: BinOpTemplate;

  /** load r, g, b, or a, or custom function */
  loadComponent?: LoadableComponent | LoadTemplate;

  /** cache for GPUComputePipeline */
  pipelineCache?: <T extends object>() => Cache<T>;

  /** {@inheritDoc ReduceTexture#label} */
  label?: string;
}

const defaults: Partial<ReduceTextureParams> = {
  blockSize: [4, 4],
  bufferBlockLength: undefined,
  reduceTemplate: maxF32,
  loadComponent: "r",
  workgroupSize: undefined,
  pipelineCache: undefined,
  label: "",
};

/**
 * A sequence of shader dispatches that reduces a source texture to a single value
 * according to a specified binary operation (e.g. min, max, or sum).
 *
 * Two underlying shaders are used:
 *   . one to reduce the source texture to a smaller buffer
 *   . one to reduce a buffer to smaller buffer
 *
 * When executed, FrameReduceSequence will dispatch a sufficient number of times
 * to end with a single value. The final result is stored in a single element
 * `reducedResult` buffer.
 */
export class ReduceTexture extends HasReactive implements ComposableShader {
  @reactively source!: GPUTexture;

  /** length of block to read when reducing from texture to buffer */
  @reactively blockSize!: Vec2;

  /** length of block to read when reducing from buffer to buffer */
  @reactively bufferBlockLength!: number | undefined;

  @reactively workgroupSize!: Vec2 | undefined;
  @reactively reduceTemplate!: BinOpTemplate;

  /** macros to select component from vec4 */
  @reactively loadComponent!: LoadableComponent | LoadTemplate;

  /** Debug label attached to gpu objects for error reporting */
  @reactively label?: string;

  private device!: GPUDevice;
  private usageContext = trackContext();
  private pipelineCache?: <T extends object>() => Cache<T>;

  constructor(params: ReduceTextureParams) {
    super();
    assignParams<ReduceTexture>(this, params, defaults);
  }

  commands(commandEncoder: GPUCommandEncoder): void {
    this.shaders.forEach(s => s.commands(commandEncoder));
  }

  destroy(): void {
    this.usageContext.finish();
  }

  /** result of the final reduction pass, one element in size */
  @reactively get reducedResult(): GPUBuffer {
    if (this.reduceBufferNeeded) {
      return this.reduceTexture.reducedResult;
    } else {
      return this.reduceBuffer.result;
    }
  }

  /** all shaders needed to reduce the texture to a single reduced value */
  @reactively get shaders(): ComposableShader[] {
    if (this.reduceBufferNeeded) {
      return [this.reduceTexture, this.reduceTexture];
    } else {
      return [this.reduceTexture];
    }
  }

  @reactively get reduceTexture(): ReduceTextureToBuffer {
    const shader = new ReduceTextureToBuffer({
      device: this.device,
      source: () => this.source,
      blockSize: this.blockSize,
      workgroupSize: this.workgroupSize,
      reduceTemplate: this.reduceTemplate,
      loadTemplate: this.loadTemplate,
      pipelineCache: this.pipelineCache,
      label: this.label,
    });
    reactiveTrackUse(shader, this.usageContext);
    return shader;
  }

  @reactively private get reduceBufferNeeded():boolean  {
    return this.reduceTexture.resultElems > 1
  }


  /** created if necessary, a shader to reduce the buffer to a single element */
  @reactively private get reduceBuffer(): ReduceBuffer {
    const shader = new ReduceBuffer({
      device: this.device,
      source: () => this.reduceTexture.reducedResult,
      workgroupLength: this.workgroupSize?.[0],
      label: this.label,
      blockLength: this.bufferBlockLength,
      pipelineCache: this.pipelineCache,
    });
    reactiveTrackUse(shader, this.usageContext);

    return shader;
  }

  // /** number of threads in each workgroup for the texture reduce phase */
  // @reactively({ equals: deepEqual }) private textureWorkSize(): Vec2 {
  //   const maxThreads = this.device.limits.maxComputeInvocationsPerWorkgroup;
  //   const {
  //     workThreads = maxThreads,
  //     source: srcTexture,
  //     blockSize: blockLength,
  //     device,
  //   } = this;
  //   const fbSize: Vec2 = [srcTexture.width, srcTexture.height];

  //   const w = Math.floor(Math.sqrt(workThreads));
  //   const proposedSize = [w, w] as Vec2;

  //   const offeredSize = proposedSize || proposeTextureGroupSize(fbSize, blockLength);
  //   return limitWorkgroupSize(device, offeredSize);
  // }

  // /** @return the number of workgroups dispatched for the texture reduce phase */
  // @reactively({ equals: deepEqual }) private textureDispatch(): Vec2 {
  //   const { source: srcTexture, blockSize: blockLength } = this;
  //   const fbSize: Vec2 = [srcTexture.width, srcTexture.height];
  //   const workSize = this.textureWorkSize();
  //   const dispatch = [0, 1].map(i =>
  //     Math.ceil(fbSize[i] / (workSize[i] * blockLength))
  //   ) as Vec2;
  //   return dispatch;
  // }

  // /** number of threads per workgroup for the buffer reduce phases */
  // @reactively private bufWorkLength(): number {
  //   const { device, workThreads: suggestWorkThreads } = this;
  //   const maxThreads = device.limits.maxComputeInvocationsPerWorkgroup;
  //   return suggestWorkThreads ? Math.min(suggestWorkThreads, maxThreads) : maxThreads;
  // }

  /** reduction template for loading src data from the texture */
  @reactively private get loadTemplate(): LoadTemplate {
    if (typeof this.loadComponent === "string") {
      return loaderForComponent(this.loadComponent);
    } else {
      return this.loadComponent;
    }
  }

}
// TODO mv this this size adjustmetn ReduceTextureToBuffer

/** @return ideal size of the workgroups for the reduction from the source texture */
function proposeTextureGroupSize(fbSize: Vec2, blockLength: number): Vec2 {
  // try for a workgroup big enough to to cover the framebuffer
  return fbSize.map(size => Math.ceil(size / blockLength)) as Vec2;
}

/** modify a workgroupSize to stay within device limits */
function limitWorkgroupSize(device: GPUDevice, proposed: Vec2): Vec2 {
  const { limits } = device;
  const threads = proposed[0] * proposed[1];

  // shrink if too many total threads
  const maxThreads = limits.maxComputeInvocationsPerWorkgroup;
  const shinkFactor = threads > maxThreads ? threads / maxThreads : 1;
  const shrunk = proposed.map(size => Math.floor(size / shinkFactor)) as Vec2;

  // shrink further if workgroup axis is too big
  const maxX = limits.maxComputeWorkgroupSizeX;
  const maxY = limits.maxComputeWorkgroupSizeY;
  const size = [maxX, maxY].map((max, i) => Math.min(shrunk[i], max)) as Vec2;

  return size;
}
