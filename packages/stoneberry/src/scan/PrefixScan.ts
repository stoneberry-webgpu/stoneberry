import { HasReactive, reactively } from "@reactively/decorate";
import {
  assignParams,
  limitWorkgroupLength,
  reactiveTrackUse,
  trackContext,
  trackUse,
} from "thimbleberry";
import { runAndFetchResult } from "../util/RunAndFetch.js";
import { Cache, ComposableShader, ValueOrFn } from "../util/Util.js";
import { ApplyScanBlocks } from "./ApplyScanBlocks.js";
import { WorkgroupScan } from "./WorkgroupScan.js";
import { BinOpModule } from "../util/BinOpModules.js";
import { sumU32 } from "../binop/BinOpModuleSumU32.js";

/** Parameters to construct a {@link PrefixScan} instance.  */
export interface PrefixScanArgs {
  device: GPUDevice;

  /**
   * Source data to be scanned.
   *
   * A function returning the source buffer will be executed lazily,
   * and reexecuted if the function's `@reactively` source values change.
   */
  source: ValueOrFn<GPUBuffer>;

  /** {@inheritDoc PrefixScan#binOps} */
  binOps?: BinOpModule;

  /** {@inheritDoc PrefixScan#exclusive} */
  exclusive?: boolean;

  /** {@inheritDoc PrefixScan#initialValue} */
  initialValue?: number;

  /** {@inheritDoc PrefixScan#label} */
  label?: string;

  /** {@inheritDoc PrefixScan#forceWorkgroupLength} */
  forceWorkgroupLength?: number;

  /** {@inheritDoc PrefixScan#maxWorkgroups} */
  maxWorkgroups?: number;

  /** cache for GPUComputePipeline */
  pipelineCache?: <T extends object>() => Cache<T>;
}

const defaults: Partial<PrefixScanArgs> = {
  forceWorkgroupLength: undefined,
  maxWorkgroups: undefined,
  binOps: sumU32,
  pipelineCache: undefined,
  label: "",
  initialValue: 0,
  exclusive: false,
};

/**
 * A cascade of shaders to do a prefix scan operation, based on a shader that
 * does a prefix scan of a workgroup sized chunk of data (e.g. 64 or 256 elements).
 *
 * The scan operation is parameterized by the module mechanism. The user can
 * instantiate a PrefixScan with sum to get prefix-sum, or use another module for
 * other parallel scan applications.
 *
 * For small data sets that fit in workgroup, only a single shader pass is needed.
 * For larger data sets, a sequence of shaders is orchestrated as follows:
 *
 *   1. One shader does a prefix scan on each workgroup sized chunk of data.
 *     It emits a partial prefix sum for each workgroup and single block level sum from each workgroup
 *   2. Another instance of the same shader does a prefix scan on the block sums from the previous shader.
 *     The end result is a set of block level prefix sums
 *   3. A final shader sums the block prefix sums back with the partial prefix sums
 *
 * For for very large data sets, steps 2 and 3 repeat heirarchically.
 * Each level of summing reduces the data set by a factor of the workgroup size.
 * So three levels handles e.g. 16M elements (256 ** 3) if the workgroup size is 256.
 *
 * @typeParam T - Type of elements returned from the scan
 */
export class PrefixScan<T = number> extends HasReactive implements ComposableShader {
  /** customize the type of scan (e.g. prefix sum on 32 bit floats) */
  @reactively binOps!: BinOpModule;

  /** Source data to be scanned */
  @reactively source!: GPUBuffer;

  /** Debug label attached to gpu objects for error reporting */
  @reactively label?: string;

  /** Override to set compute workgroup size e.g. for testing. 
    @defaultValue max workgroup size of the `GPUDevice`
    */
  @reactively forceWorkgroupLength?: number;

  /** Override to set max number of workgroups for dispatch e.g. for testing. 
    @defaultValue maxComputeWorkgroupsPerDimension from the `GPUDevice`
    */
  @reactively maxWorkgroups?: number;

  /** Inclusive scan accumulates a binary operation across all source elements.
   * Exclusive scan accumulates a binary operation across source elements, using initialValue
   * as the first element and stopping before the final source element.
   *
   * @defaultValue false (inclusive scan).
   */
  @reactively exclusive!: boolean;

  /** Initial value for exclusive scan
   * @defaultValue 0
   */
  @reactively initialValue?: number;

  /** start index in src buffer of range to scan (0 if undefined) */
  //  start?: ValueOrFn<number>; // NYI
  /** end index (exclusive) in src buffer (src.length if undefined) */
  // end?: ValueOrFn<number>; // NYI

  device!: GPUDevice;
  private usageContext = trackContext();

  /** cache for GPUComputePipeline or GPURenderPipeline */
  private pipelineCache?: <C extends object>() => Cache<C>;

  /** Create a new scanner
   * @param args
   */
  constructor(args: PrefixScanArgs) {
    super();
    assignParams<PrefixScan<T>>(this, args, defaults);
  }

  commands(commandEncoder: GPUCommandEncoder): void {
    this.shaders.forEach(s => s.commands(commandEncoder));
  }

  /** Release the scanResult buffer for destruction. */
  destroy(): void {
    this.usageContext.finish();
  }

  /** Execute the prefix scan immediately and copy the results back to the CPU.
   * (results are copied from the {@link PrefixScan.result} GPUBuffer)
   * @returns the scanned result in an array
   */
  async scan(): Promise<number[]> {
    const label = `${this.label} prefixScan`;
    return runAndFetchResult(this, this.binOps.outputElements!, label);
  }

  /** Buffer containing results of the scan after the shader has run. */
  @reactively get result(): GPUBuffer {
    if (this.fitsInWorkGroup) {
      return this._sourceScan.prefixScan;
    } else {
      return this.applyScans.slice(-1)[0].result;
    }
  }

  @reactively private get shaders(): ComposableShader[] {
    return [this._sourceScan, ...this._blockScans, ...this.applyScans];
  }

  /** @internal */
  @reactively get _sourceScan(): WorkgroupScan {
    const exclusiveSmall = this.exclusive && this.fitsInWorkGroup;
    const shader = new WorkgroupScan({
      device: this.device,
      source: this.source,
      emitBlockSums: true,
      exclusiveSmall,
      initialValue: this.initialValue,
      binOps: this.binOps,
      forceWorkgroupLength: this.forceWorkgroupLength,
      forceMaxWorkgroups: this.maxWorkgroups,
      label: `${this.label} sourceScan`,
      pipelineCache: this.pipelineCache,
    });
    reactiveTrackUse(shader, this.usageContext);
    return shader;
  }

  /**
   * Shaders to scan intermediate block sums.
   * Multiple levels of scanning may be required for large sums.
   * @internal
   */
  @reactively get _blockScans(): WorkgroupScan[] {
    const sourceElements = this.sourceSize / Uint32Array.BYTES_PER_ELEMENT;
    const wl = this.workgroupLength;
    const shaders: WorkgroupScan[] = [];

    // stitch a chain: blockSums as sources for scans
    let source = this._sourceScan.blockSums;
    for (let elements = wl; elements < sourceElements; elements *= wl) {
      const last = elements * wl >= sourceElements;
      const blockScan = new WorkgroupScan({
        device: this.device,
        source,
        emitBlockSums: !last,
        binOps: this.binOps,
        forceWorkgroupLength: this.forceWorkgroupLength,
        forceMaxWorkgroups: this.maxWorkgroups,
        label: `${this.label} blockScan`,
        pipelineCache: this.pipelineCache,
      });
      source = blockScan.blockSums;
      shaders.push(blockScan);
    }
    shaders.forEach(s => trackUse(s, this.usageContext));

    return shaders;
  }

  @reactively private get sourceSize(): number {
    return this.source.size;
  }

  @reactively private get fitsInWorkGroup(): boolean {
    const sourceElems = this.sourceSize / Uint32Array.BYTES_PER_ELEMENT;
    return sourceElems <= this.workgroupLength;
  }

  @reactively private get workgroupLength(): number {
    return limitWorkgroupLength(this.device, this.forceWorkgroupLength);
  }

  /** shader passes to apply block level sums to prefixes within the block */
  @reactively private get applyScans(): ApplyScanBlocks[] {
    if (this.fitsInWorkGroup) {
      return [];
    }
    const exclusiveLarge = this.exclusive; // if it was small, we'd have returned
    const blockShadersReverse = [...this._blockScans].reverse(); // block producing shaders in reverse order
    const blockPrefixesReverse = blockShadersReverse.map(s => s.prefixScan);

    // partial prefix scans (to which we'll sum with the block prefixes)
    const targetPrefixes = [
      ...blockPrefixesReverse.slice(1),
      this._sourceScan.prefixScan,
    ];

    // stitch chain, with completed block prefixes as sources to the next applyBlock shader
    let blockSums = this._blockScans.slice(-1)[0].prefixScan;
    const allApplyBlocks = blockShadersReverse.map((s, i) => {
      const applyBlocks = new ApplyScanBlocks({
        device: this.device,
        partialScan: targetPrefixes[i],
        blockSums,
        binOps: this.binOps,
        exclusiveLarge,
        initialValue: this.initialValue,
        forceWorkgroupLength: this.forceWorkgroupLength,
        forceMaxWorkgroups: this.maxWorkgroups,
        label: `${this.label} applyBlock`,
        pipelineCache: this.pipelineCache,
      });
      blockSums = applyBlocks.result;
      return applyBlocks;
    });
    allApplyBlocks.forEach(s => trackUse(s, this.usageContext));
    return allApplyBlocks;
  }
}

/**
 * TBD:
 *  . generator for one workgroup size? - I don't understand this one fully.
 *  . support for a debug error context
 *  . sharing bind groups? - no proposal here
 */
