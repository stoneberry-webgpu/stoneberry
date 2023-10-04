import deepEqual from "fast-deep-equal";
import { HasReactive, reactively } from "@reactively/decorate";
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
import { BinOpTemplate, maxF32 } from "../util/BinOpTemplate.js";
import { LoadTemplate } from "../util/LoadTemplate.js";
import { getReduceTexturePipeline } from "./ReduceTexturePipeline.js";

export interface TextureToBufferParams {
  device: GPUDevice;
  /**
   * Source data to be reduced.
   *
   * A function returning the source buffer will be executed lazily,
   * and reexecuted if the function's `@reactively` source values change.
   */
  source: ValueOrFn<GPUTexture>;

  /** {@inheritDoc ReduceTextureToBuffer#resultOffset} */
  resultOffset?: number;

  /** {@inheritDoc ReduceTextureToBuffer#blockSize} */
  blockSize?: Vec2;

  /** {@inheritDoc ReduceTextureToBuffer#workgroupLength} */
  workgroupSize?: Vec2;

  /** {@inheritDoc ReduceTextureToBuffer#template} */
  reduceTemplate?: BinOpTemplate;

  /** {@inheritDoc ReduceTextureToBuffer#template} */
  loadTemplate?: LoadTemplate;

  /** cache for GPUComputePipeline */
  pipelineCache?: <T extends object>() => Cache<T>;

  /** {@inheritDoc ReduceTextureToBuffer#label} */
  label?: string;

  /** {@inheritDoc ReduceBuffer#maxWorkgroups} */
  maxWorkgroups?: number | undefined;
}

const defaults: Partial<TextureToBufferParams> = {
  blockSize: [4, 4],
  resultOffset: 0,
  reduceTemplate: maxF32,
  workgroupSize: undefined,
  pipelineCache: undefined,
  label: "",
};

export class ReduceTextureToBuffer extends HasReactive implements ComposableShader {
  /** Source texture to be reduced */
  @reactively source!: GPUTexture;

  /** macros to customize wgsl shader for size of data and type of reduce*/
  @reactively reduceTemplate!: BinOpTemplate;

  /** macros to select component from vec4 */
  @reactively loadTemplate!: LoadTemplate;

  /** Debug label attached to gpu objects for error reporting */
  @reactively label?: string;

  /** start scan at this element offset in the source. (0) */
  @reactively sourceOffset!: number;

  /** start emitting results at this element offset in the results. (0) */
  @reactively resultOffset!: number;

  /** number of elements to reduce in each invocation (4) */
  @reactively({ equals: deepEqual }) blockSize!: Vec2;

  /** Override to set compute workgroup size e.g. for testing. 
    @defaultValue maxComputeInvocationsPerWorkgroup of the `GPUDevice` (256)
    */
  @reactively({ equals: deepEqual }) workgroupSize!: Vec2;

  /** Override to set max number of workgroups for dispatch e.g. for testing. 
    @defaultValue maxComputeWorkgroupsPerDimension from the `GPUDevice` (65535)
    */
  @reactively maxWorkgroups?: number;

  private device!: GPUDevice;
  private pipelineCache?: <T extends object>() => Cache<T>;
  private usageContext = trackContext();

  @reactively reducedResult!: GPUBuffer;

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

  @reactively get debugBuffer(): GPUBuffer {
    const buffer = createDebugBuffer(this.device, "TextureReduce debug");
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively private pipeline(): GPUComputePipeline {
    return getReduceTexturePipeline(
      {
        device: this.device,
        workgroupSize: this.workgroupSize,
        blockLength: this.blockSize[0], // TODO blockSize
        reduceTemplate: this.reduceTemplate,
        loadTemplate: this.loadTemplate,
      },
      this.pipelineCache
    );
  }

  @reactively private get dispatchSize(): Vec2 {
    return [1, 1]; // TODO
  }

  @reactively private bindGroup(): GPUBindGroup {
    const srcView = this.source.createView({ label: "texture reduce src view" });
    return this.device.createBindGroup({
      label: "textureReduce binding",
      layout: this.pipeline().getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: srcView },
        { binding: 1, resource: { buffer: this.reducedResult } },
        { binding: 11, resource: { buffer: this.debugBuffer } },
      ],
    });
  }
}
