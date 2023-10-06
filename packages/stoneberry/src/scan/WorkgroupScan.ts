import { HasReactive, reactively } from "@reactively/decorate";
import {
  assignParams,
  createDebugBuffer,
  gpuTiming,
  limitWorkgroupLength,
  reactiveTrackUse,
  trackContext,
} from "thimbleberry";
import { calcDispatchSizes } from "../util/DispatchSizes.js";
import { Cache, ComposableShader, ValueOrFn } from "../util/Util.js";
import { getWorkgroupScanPipeline } from "./WorkgroupScanPipeline";
import { BinOpTemplate, sumU32 } from "../util/BinOpTemplate.js";

/** @internal */
export interface WorkgroupScanArgs {
  device: GPUDevice;
  source: ValueOrFn<GPUBuffer>;
  emitBlockSums?: ValueOrFn<boolean>;
  forceWorkgroupLength?: ValueOrFn<number>;
  maxWorkgroups?: ValueOrFn<number | undefined>;
  label?: ValueOrFn<string>;
  template?: ValueOrFn<BinOpTemplate>;
  exclusiveSmall?: boolean;
  initialValue?: ValueOrFn<number>;
  sourceOffset?: ValueOrFn<number>;
  scanOffset?: ValueOrFn<number>;
  blockSumsOffset?: ValueOrFn<number>;
  pipelineCache?: <T extends object>() => Cache<T>;
}

const defaults: Partial<WorkgroupScanArgs> = {
  emitBlockSums: true,
  pipelineCache: undefined,
  label: "",
  template: sumU32,
  exclusiveSmall: false,
  initialValue: 0,
  maxWorkgroups: undefined,
  sourceOffset: 0,
  scanOffset: 0,
  blockSumsOffset: 0,
  forceWorkgroupLength: undefined,
};

/**
 * Prefix scan operation on workgroup sized blocks of data.
 *
 * Internally allocates an output buffer for the prefix scan results.
 * The output buffer will be the same dimensions as the input buffer.
 *
 * Optionally allocates a block level summary buffer, containing
 * one summariy entry per input block.
 *
 * @internal
 */
export class WorkgroupScan extends HasReactive implements ComposableShader {
  /** source data to be scanned. Data element format should match the template. */
  @reactively source!: GPUBuffer;

  /** macros to customize wgsl shader for size of data and type of scan */
  @reactively template!: BinOpTemplate;

  /** emit the final value of each block into a separate output buffer. (true) */
  @reactively emitBlockSums!: boolean;

  /** Debug label attached to gpu objects for error reporting */
  @reactively label!: string;

  /** an exclusive scan that fits entirely in one workgroup. (false) */
  @reactively exclusiveSmall!: boolean;

  /** initial value for exclusive scans */
  @reactively initialValue!: number;

  /** start scan at this element offset in the source. (0) */
  @reactively sourceOffset!: number;

  /** emit results at this element offset in the destination buffer. (0) */
  @reactively scanOffset!: number;

  /** emit block results at this element offset in the blocksums destination buffer (0) */
  @reactively blockSumsOffset!: number;

  /** Override to set compute workgroup size e.g. for testing. 
    @defaultValue maxComputeInvocationsPerWorkgroup of the `GPUDevice`
    */
  @reactively forceWorkgroupLength?: number;

  /** Override to set max number of workgroups for dispatch e.g. for testing. 
    @defaultValue maxComputeWorkgroupsPerDimension from the `GPUDevice`
    */
  @reactively maxWorkgroups?: number;

  private device!: GPUDevice;
  private pipelineCache?: <T extends object>() => Cache<T>;
  private usageContext = trackContext();

  constructor(params: WorkgroupScanArgs) {
    super();
    assignParams<WorkgroupScan>(this, params, defaults);
  }

  commands(commandEncoder: GPUCommandEncoder): void {
    this.updateUniforms();
    const bindGroups = this.bindGroups;
    this.dispatchSizes.forEach((dispatchSize, i) => {
      const timestampWrites = gpuTiming?.timestampWrites(`${this.label} ${dispatchSize}`);
      const passEncoder = commandEncoder.beginComputePass({ timestampWrites });
      passEncoder.label = `${this.label} workgroup scan`;
      passEncoder.setPipeline(this.pipeline);
      passEncoder.setBindGroup(0, bindGroups[i]);
      passEncoder.dispatchWorkgroups(dispatchSize, 1, 1);
      passEncoder.end();
    });
  }

  destroy(): void {
    this.usageContext.finish();
  }

  /** Buffer combining the last element from each workgroups partial scan
   * For use in combining scans that are larger than one workgroup. */
  @reactively get blockSums(): GPUBuffer {
    const proposedSize = this.sourceSize / this.workgroupLength;
    const size = Math.ceil(proposedSize / 4) * 4; // ensure size is a multiple of 4
    const buffer = this.device.createBuffer({
      label: `${this.label} workgroup scan block sums`,
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively get debugBuffer(): GPUBuffer {
    const buffer = createDebugBuffer(this.device, `${this.label} workgroup scan debug`);
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  /** Return enough dispatches to cover the source
   * (multiple dispatches are needed for large sources) */
  @reactively private get dispatchSizes(): number[] {
    const sourceElems =
      this.sourceSize / Uint32Array.BYTES_PER_ELEMENT - this.sourceOffset; // TODO support other src element sizes, via template
    const max = this.actualMaxWorkgroups;
    return calcDispatchSizes(sourceElems, this.workgroupLength, max);
  }

  @reactively private get actualMaxWorkgroups(): number {
    return this.maxWorkgroups ?? this.device.limits.maxComputeWorkgroupsPerDimension;
  }

  @reactively private get pipeline(): GPUComputePipeline {
    return getWorkgroupScanPipeline(
      {
        device: this.device,
        workgroupSize: this.workgroupLength,
        blockSums: this.emitBlockSums,
        template: this.template,
      },
      this.pipelineCache
    );
  }

  @reactively private get bindGroups(): GPUBindGroup[] {
    return this.dispatchSizes.map((_, i) => this.createBindGroup(i));
  }

  private createBindGroup(index: number): GPUBindGroup {
    let blockSumsEntry: GPUBindGroupEntry[] = [];
    if (this.emitBlockSums) {
      blockSumsEntry = [{ binding: 3, resource: { buffer: this.blockSums } }];
    }
    const uniforms = this.uniforms;

    return this.device.createBindGroup({
      label: `${this.label} workgroup scan`,
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniforms[index] } },
        { binding: 1, resource: { buffer: this.source } },
        { binding: 2, resource: { buffer: this.prefixScan } },
        ...blockSumsEntry,
        { binding: 11, resource: { buffer: this.debugBuffer } },
      ],
    });
  }

  @reactively get sourceSize(): number {
    return this.source.size;
  }

  @reactively get prefixScan(): GPUBuffer {
    const buffer = this.device.createBuffer({
      label: `${this.label} prefix scan`,
      size: this.sourceSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  // TODO use one uniform buffer, with dynamic offsets instead
  @reactively private get uniforms(): GPUBuffer[] {
    return this.dispatchSizes.map((_, i) => this.uniformsBuffer(i));
  }

  private uniformsBuffer(index: number): GPUBuffer {
    const buffer = this.device.createBuffer({
      label: `${this.label} ${index} workgroup scan uniforms`,
      size: Uint32Array.BYTES_PER_ELEMENT * 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively private updateUniforms(): void {
    let sourceOffset = this.sourceOffset;
    let scanOffset = this.scanOffset;
    let blockSumsOffset = this.blockSumsOffset;

    const uniforms = this.uniforms;
    this.dispatchSizes.map((dispatchSize, i) => {
      this.writeUniforms(uniforms[i], sourceOffset, scanOffset, blockSumsOffset);
      sourceOffset += dispatchSize * this.workgroupLength;
      scanOffset += dispatchSize * this.workgroupLength;
      blockSumsOffset += dispatchSize;
    });
  }

  private writeUniforms(
    uniforms: GPUBuffer,
    sourceOffset: number,
    scanOffset: number,
    blockSumsOffset: number
  ): void {
    const array = new Uint32Array([
      sourceOffset,
      scanOffset,
      blockSumsOffset,
      this.exclusiveSmall ? 1 : 0,
      this.initialValue,
    ]);
    this.device.queue.writeBuffer(uniforms, 0, array);
  }

  @reactively private get workgroupLength(): number {
    return limitWorkgroupLength(this.device, this.forceWorkgroupLength);
  }
}
