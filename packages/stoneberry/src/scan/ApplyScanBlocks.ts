import { HasReactive, reactively } from "@reactively/decorate";
import {
  assignParams,
  createDebugBuffer,
  gpuTiming,
  limitWorkgroupLength,
  reactiveTrackUse,
  trackContext,
} from "thimbleberry";
import { getApplyBlocksPipeline } from "./ApplyScanBlocksPipeline";
import { ScanTemplate, sumU32 } from "./ScanTemplate.js";
import { Cache, ComposableShader } from "../util/Util.js";
import { calcDispatchSizes } from "../util/DispatchSizes.js";

/** @internal */
export interface ApplyScanBlocksArgs {
  device: GPUDevice;
  partialScan: GPUBuffer;
  blockSums: GPUBuffer;
  workgroupLength?: number;
  maxWorkgroups?: number | undefined;
  label?: string;
  template?: ScanTemplate;
  exclusiveLarge?: boolean;
  initialValue?: number;
  partialScanOffset?: number;
  blockSumsOffset?: number;
  scanOffset?: number;
  pipelineCache?: <T extends object>() => Cache<T>;
}

const defaults: Partial<ApplyScanBlocksArgs> = {
  template: sumU32,
  label: "",
  exclusiveLarge: false,
  initialValue: undefined,
  maxWorkgroups: undefined,
  partialScanOffset: 0,
  blockSumsOffset: 0,
  scanOffset: 0,
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
  @reactively partialScanOffset!: number;
  @reactively blockSumsOffset!: number;
  @reactively scanOffset!: number;
  maxWorkgroups?: number;

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
    const bindGroups = this.bindGroups;
    this.dispatchSizes.forEach((dispatchSize, i) => {
      const passEncoder = commandEncoder.beginComputePass({ timestampWrites });
      passEncoder.label = ` ${this.label} apply scan blocks`;
      passEncoder.setPipeline(this.pipeline);
      passEncoder.setBindGroup(0, bindGroups[i]);
      passEncoder.dispatchWorkgroups(dispatchSize, 1, 1);
      passEncoder.end();
    });
  }

  destroy(): void {
    this.usageContext.finish();
  }

  @reactively private get partialScanSize(): number {
    return this.partialScan.size;
  }

  /** Return enough dispatches to cover the source
   * `(multiple dispatches are needed for large sources) */
  @reactively private get dispatchSizes(): number[] {
    const sourceElems = this.partialScanSize / Uint32Array.BYTES_PER_ELEMENT;
    const maxWorkgroups = this.actualMaxWorkgroups;
    const device = this.device;
    const actualWorkgroupLength = this.actualWorkgroupLength;
    return calcDispatchSizes(device, sourceElems, actualWorkgroupLength, maxWorkgroups);
  }

  @reactively private get actualMaxWorkgroups(): number {
    return this.maxWorkgroups ?? this.device.limits.maxComputeWorkgroupsPerDimension;
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

  @reactively private get bindGroups(): GPUBindGroup[] {
    return this.dispatchSizes.map((_, i) => this.createBindGroup(i));
  }

  private createBindGroup(index: number): GPUBindGroup {
    return this.device.createBindGroup({
      label: `${this.label} ${index} apply scan blocks`,
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniforms[index] } },
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
    return limitWorkgroupLength(this.device, this.workgroupLength);
  }

  @reactively get debugBuffer(): GPUBuffer {
    const buffer = createDebugBuffer(this.device, "ApplyScanBlocks debug");
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively private get uniforms(): GPUBuffer[] {
    return this.dispatchSizes.map((_, i) => this.uniformsBuffer(i));
  }

  private uniformsBuffer(index: number): GPUBuffer {
    const buffer = this.device.createBuffer({
      label: `${this.label} ${index} apply scan blocks uniforms`,
      size: Uint32Array.BYTES_PER_ELEMENT * 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively private updateUniforms(): void {
    let partialScanOffset = this.partialScanOffset;
    let scanOffset = this.scanOffset;
    let blockSumsOffset = this.blockSumsOffset;
    const uniforms = this.uniforms;

    this.dispatchSizes.map((dispatchSize, i) => {
      this.writeUniforms(uniforms[i], partialScanOffset, scanOffset, blockSumsOffset);
      partialScanOffset += dispatchSize * this.actualWorkgroupLength;
      scanOffset += dispatchSize * this.actualWorkgroupLength;
      blockSumsOffset += dispatchSize;
    });
  }

  private writeUniforms(
    uniforms: GPUBuffer,
    partialScanOffset: number,
    scanOffset: number,
    blockSumsOffset: number
  ): void {
    const exclusive = this.exclusiveLarge ? 1 : 0;
    const initialValue = this.initialValue;
    const array = new Uint32Array([
      partialScanOffset,
      scanOffset,
      blockSumsOffset,
      exclusive,
      initialValue,
    ]);
    this.device.queue.writeBuffer(uniforms, 0, array);
  }
}
