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
import { BinOpTemplate2 } from "../util/BinOpModules.js";
import {
  ComponentName,
  LoadComponent,
  loadTexelCodeGen
} from "../util/LoadTemplate.js";
import { runAndFetchResult } from "../util/RunAndFetch.js";
import { ReduceTextureToBuffer } from "./ReduceTextureToBuffer.js";

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

  /** {@inheritDoc ReduceTexture#forceWorkgroupSize} */
  forceWorkgroupSize?: Vec2;

  /** {@inheritDoc ReduceTexture#reduceTemplate} */
  reduceTemplate: BinOpTemplate2;

  /** load r, g, b, or a, or custom function */
  loadComponent?: ComponentName | LoadComponent;

  /** cache for GPUComputePipeline */
  pipelineCache?: <T extends object>() => Cache<T>;

  /** {@inheritDoc ReduceTexture#label} */
  label?: string;
}

const defaults: Partial<ReduceTextureParams> = {
  blockSize: [4, 4],
  bufferBlockLength: 16,
  loadComponent: "r",
  forceWorkgroupSize: undefined,
  pipelineCache: undefined,
  label: "",
};

/**
 * A sequence of shader dispatches that reduces a source texture to a single value
 * according to a specified binary operation (e.g. min, max, or sum).
 *
 * Two underlying shaders are used:
 *   . one to reduce the source texture to a small buffer
 *   . one to reduce a small buffer to smaller buffer
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

  /** number and arrangement of threads in each dispatched workgroup */
  @reactively forceWorkgroupSize!: Vec2 | undefined;

  /** wgsl macros for a binary operation to reduce two elements to one */
  @reactively reduceTemplate!: BinOpTemplate2;

  /** macros to select or synthesize a component from the source texture */
  @reactively texelComponent!: ComponentName | LoadComponent;

  /** Debug label attached to gpu objects for error reporting */
  @reactively label?: string;

  device!: GPUDevice;
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

  /** Execute the reduce immediately and copy the results back to the CPU.
   * (results are copied from the {@link ReduceTexture.result} GPUBuffer)
   * @returns a single reduced result value in an array
   */
  async reduce(): Promise<number[]> {
    const label = `${this.label} reduceTexture`;
    return runAndFetchResult(this, this.reduceTemplate.outputElements!, label);
  }

  /** result of the final reduction pass, one element in size */
  @reactively get result(): GPUBuffer {
    if (this.reduceBufferNeeded) {
      return this.reduceBuffer.result;
    } else {
      return this.reduceTexture.reducedResult;
    }
  }

  /** all shaders needed to reduce the texture to a single reduced value */
  @reactively private get shaders(): ComposableShader[] {
    if (this.reduceBufferNeeded) {
      return [this.reduceTexture, this.reduceBuffer];
    } else {
      return [this.reduceTexture];
    }
  }

  /** shader to reduce the texture to a buffer */
  @reactively private get reduceTexture(): ReduceTextureToBuffer {
    const shader = new ReduceTextureToBuffer({
      device: this.device,
      source: () => this.source,
      blockSize: this.blockSize,
      forceWorkgroupSize: this.forceWorkgroupSize,
      reduceTemplate: this.reduceTemplate,
      loadComponent: this.loadComponent,
      pipelineCache: this.pipelineCache,
      label: this.label,
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
      source: () => this.reduceTexture.reducedResult,
      forceWorkgroupLength: workgroupLength,
      label: this.label,
      blockLength: this.bufferBlockLength,
      pipelineCache: this.pipelineCache,
      template2: this.reduceTemplate,
    });
    reactiveTrackUse(shader, this.usageContext);

    return shader;
  }

  @reactively private get reduceBufferNeeded(): boolean {
    return this.reduceTexture.resultElems > 1;
  }

  /** reduction template for loading src data from the texture */
  @reactively private get loadComponent(): LoadComponent {
    const texelComponent = this.texelComponent;
    if (typeof texelComponent === "string") {
      return loadTexelCodeGen(texelComponent);
    } else {
      return texelComponent;
    }
  }
}
