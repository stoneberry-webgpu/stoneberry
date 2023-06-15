import { HasReactive, reactively } from "@reactively/decorate";
import {
  assignParams,
  createDebugBuffer,
  gpuTiming,
  reactiveTrackUse,
  trackContext,
} from "thimbleberry";
import { getApplyBlocksPipeline } from "./ApplyScanBlocksPipeline";
import { ScanTemplate, sumU32 } from "./ScanTemplate.js";
import { Cache, ComposableShader } from "../util/Util.js";

/** @internal */
export interface ApplyScanBlocksArgs {
  device: GPUDevice;
  partialScan: GPUBuffer;
  blockSums: GPUBuffer;
  workgroupLength?: number;
  label?: string;
  template?: ScanTemplate;
  exclusiveLarge?: boolean;
  initialValue?: number;
  pipelineCache?: <T extends object>() => Cache<T>;
}

const defaults: Partial<ApplyScanBlocksArgs> = {
  template: sumU32,
  label: "",
  exclusiveLarge: false,
  initialValue: undefined,
};

/** Shader stage used in a prefix scan, applies block summaries to block elements 
 * @internal
*/
export class ApplyScanBlocks extends HasReactive implements ComposableShader {
  @reactively partialScan!: GPUBuffer;
  @reactively blockSums!: GPUBuffer;
  @reactively workgroupLength?: number;
  @reactively template!: ScanTemplate;
  @reactively label!: string;
  @reactively exclusiveLarge!: boolean;
  @reactively initialValue!: number;

  private device!: GPUDevice;
  private usageContext = trackContext();
  private pipelineCache?: <T extends object>() => Cache<T>;

  constructor(params: ApplyScanBlocksArgs) {
    super();
    assignParams<ApplyScanBlocks>(this, params, defaults);
  }

  commands(commandEncoder: GPUCommandEncoder): void {
    this.updateUniforms();
    const timestampWrites = gpuTiming?.timestampWrites(this.label);
    const passEncoder = commandEncoder.beginComputePass({ timestampWrites });
    passEncoder.label = ` ${this.label} apply scan blocks`;
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.dispatchWorkgroups(this.dispatchSize, 1, 1);
    passEncoder.end();
  }

  destroy(): void {
    this.usageContext.finish();
  }

  @reactively private get partialScanSize(): number {
    return this.partialScan.size;
  }

  @reactively private get dispatchSize(): number {
    const sourceElems = this.partialScanSize / Uint32Array.BYTES_PER_ELEMENT;
    const dispatchSize = Math.ceil(sourceElems / this.actualWorkgroupLength);
    return dispatchSize;
  }

  @reactively private get pipeline(): GPUComputePipeline {
    return getApplyBlocksPipeline(
      {
        device: this.device,
        workgroupLength: this.actualWorkgroupLength,
        template: this.template,
      },
      this.pipelineCache
    );
  }

  @reactively private get bindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      label: `${this.label} apply scan blocks`,
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniforms } },
        { binding: 2, resource: { buffer: this.partialScan } },
        { binding: 3, resource: { buffer: this.blockSums } },
        { binding: 4, resource: { buffer: this.result } },
        { binding: 11, resource: { buffer: this.debugBuffer } },
      ],
    });
  }

  @reactively get result(): GPUBuffer {
    const buffer = this.device.createBuffer({
      label: `${this.label} apply scan blocks result`,
      size: this.partialScanSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively private get actualWorkgroupLength(): number {
    const { device, workgroupLength: proposedLength } = this;
    const maxThreads = device.limits.maxComputeInvocationsPerWorkgroup;
    let length: number;
    if (!proposedLength || proposedLength > maxThreads) {
      length = maxThreads;
    } else {
      length = proposedLength;
    }
    return length;
  }

  @reactively get debugBuffer(): GPUBuffer {
    const buffer = createDebugBuffer(this.device, "ApplyScanBlocks debug");
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively private get uniforms(): GPUBuffer {
    const buffer = this.device.createBuffer({
      label: `${this.label} apply scan blocks uniforms`,
      size: Uint32Array.BYTES_PER_ELEMENT * 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively private updateUniforms(): void {
    const exclusive = this.exclusiveLarge ? 1 : 0;
    const initialValue = this.initialValue;
    const pad = 7;
    const array = new Uint32Array([exclusive, pad, pad, pad, initialValue]);
    this.device.queue.writeBuffer(this.uniforms, 0, array);
  }
}
