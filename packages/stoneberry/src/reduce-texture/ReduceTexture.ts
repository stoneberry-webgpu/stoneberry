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
  withBufferCopy,
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

  /** number and arrangement of threads in each dispatched workgroup */
  @reactively workgroupSize!: Vec2 | undefined;

  /** wgsl macros for a binary operation to reduce two elements to one */
  @reactively reduceTemplate!: BinOpTemplate;

  /** macros to select or synthesize a component from the source texture */
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

  async reduce(): Promise<number[]> {
    // TODO DRY with other shaders?
    const device = this.device;
    const reduceTemplate = this.reduceTemplate;

    const commands = device.createCommandEncoder({
      label: `${this.label} reduceTexture`,
    });
    this.commands(commands);
    device.queue.submit([commands.finish()]);
    await device.queue.onSubmittedWorkDone();

    const format = reduceTemplate.outputElements;
    if (!format) {
      throw new Error(
        `outputElements not defined: ${JSON.stringify(reduceTemplate, null, 2)}`
      );
    }
    const data = await withBufferCopy(device, this.reducedResult, format, d => d.slice());
    return [...data];
  }

  /** result of the final reduction pass, one element in size */
  @reactively get reducedResult(): GPUBuffer {
    if (this.reduceBufferNeeded) {
      return this.reduceBuffer.result;
    } else {
      return this.reduceTexture.reducedResult;
    }
  }

  /** all shaders needed to reduce the texture to a single reduced value */
  @reactively get shaders(): ComposableShader[] {
    if (this.reduceBufferNeeded) {
      return [this.reduceTexture, this.reduceBuffer];
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

  @reactively private get reduceBufferNeeded(): boolean {
    return this.reduceTexture.resultElems > 1;
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

  /** reduction template for loading src data from the texture */
  @reactively private get loadTemplate(): LoadTemplate {
    if (typeof this.loadComponent === "string") {
      return loaderForComponent(this.loadComponent);
    } else {
      return this.loadComponent;
    }
  }
}