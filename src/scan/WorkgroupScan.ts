import { HasReactive, reactively } from "@reactively/decorate";
import { createDebugBuffer } from "thimbleberry";
import { gpuTiming } from "thimbleberry";
import { limitWorkgroupLength } from "thimbleberry";
import { assignParams, reactiveTrackUse } from "thimbleberry";
import { trackContext } from "thimbleberry";
import { getWorkgroupScanPipeline } from "./WorkgroupScanPipeline";
import { ScanTemplate, sumU32 } from "./ScanTemplate.js";
import { Cache, ComposableShader, ValueOrFn } from "./Scan.js";

export interface WorkgroupScanArgs {
  device: GPUDevice;
  source: ValueOrFn<GPUBuffer>;
  emitBlockSums?: ValueOrFn<boolean>;
  workgroupLength?: ValueOrFn<number>;
  label?: ValueOrFn<string>;
  template?: ValueOrFn<ScanTemplate>;
  exclusiveSmall?: boolean;
  initialValue?: ValueOrFn<number>;
  pipelineCache?: <T extends object>() => Cache<T>;
}

const defaults: Partial<WorkgroupScanArgs> = {
  emitBlockSums: true,
  pipelineCache: undefined,
  label: "",
  template: sumU32,
  exclusiveSmall: false,
  initialValue: 0,
};

/**
 * Prefix scan operation on workgroup sized blocks of data.
 *
 * Internally allocates an output buffer for the prefix scan results.
 * The output buffer will be the same dimensions as the input buffer.
 *
 * Optionally allocates a block level summary buffer, containing
 * one summariy entry per input block.
 */
export class WorkgroupScan extends HasReactive implements ComposableShader {
  @reactively source!: GPUBuffer;
  @reactively workgroupLength?: number;
  @reactively template!: ScanTemplate;
  @reactively emitBlockSums!: boolean;
  @reactively label!: string;
  @reactively exclusiveSmall!: boolean;
  @reactively initialValue!: number;

  private device!: GPUDevice;
  private pipelineCache?: <T extends object>() => Cache<T>;
  private usageContext = trackContext();

  constructor(params: WorkgroupScanArgs) {
    super();
    assignParams<WorkgroupScan>(this, params, defaults);
  }

  commands(commandEncoder: GPUCommandEncoder): void {
    this.updateUniforms();
    const timestampWrites = gpuTiming?.timestampWrites(this.label);
    const passEncoder = commandEncoder.beginComputePass({ timestampWrites });
    passEncoder.label = `workgroup scan ${this.label}`;
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.dispatchWorkgroups(this.dispatchSize, 1, 1);
    passEncoder.end();
  }

  destroy(): void {
    this.usageContext.finish();
  }

  @reactively private get dispatchSize(): number {
    const sourceElems = this.sourceSize / Uint32Array.BYTES_PER_ELEMENT;
    const dispatchSize = Math.ceil(sourceElems / this.actualWorkgroupLength);
    return dispatchSize;
  }

  @reactively private get pipeline(): GPUComputePipeline {
    return getWorkgroupScanPipeline(
      {
        device: this.device,
        workgroupSize: this.actualWorkgroupLength,
        blockSums: this.emitBlockSums,
        template: this.template,
      },
      this.pipelineCache
    );
  }

  @reactively private get bindGroup(): GPUBindGroup {
    let blockSumsEntry: GPUBindGroupEntry[] = [];
    if (this.emitBlockSums) {
      blockSumsEntry = [{ binding: 3, resource: { buffer: this.blockSums } }];
    }

    return this.device.createBindGroup({
      label: `workgroup scan ${this.label}`,
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniforms } },
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
      label: `prefix scan ${this.label}`,
      size: this.sourceSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively get blockSums(): GPUBuffer {
    // ensure size is a multiple of 4
    const buffer = this.device.createBuffer({
      label: `workgroup scan block sums ${this.label}`,
      size: this.dispatchSize * Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively get uniforms(): GPUBuffer {
    const buffer = this.device.createBuffer({
      label: `workgroup scan uniforms ${this.label}`,
      size: Uint32Array.BYTES_PER_ELEMENT * 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }

  @reactively private updateUniforms(): void {
    const exclusiveSmall = this.exclusiveSmall ? 1 : 0;
    const initialValue = this.initialValue;
    const pad = 7;
    const array = new Uint32Array([exclusiveSmall, pad, pad, pad, initialValue]);
    this.device.queue.writeBuffer(this.uniforms, 0, array);
  }

  @reactively get actualWorkgroupLength(): number {
    return limitWorkgroupLength(this.device, this.workgroupLength);
  }

  @reactively get debugBuffer(): GPUBuffer {
    const buffer = createDebugBuffer(this.device, `workgroup scan debug ${this.label}`);
    reactiveTrackUse(buffer, this.usageContext);
    return buffer;
  }
}
