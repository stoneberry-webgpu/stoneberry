/**
 * A discussion sketch of the api for prefix scan.
 * TBD:
 *  . inclusive vs exclusive
 *  . initial value? - should this be dynamic or fixed in template?
 *  . generator for one workgroup size? - I don't understand this one fully.
 *  . support for a debug error context
 *  . sharing bind groups? - no proposal here
 */

import { ScanTemplate, sumU32 } from "./ScanTemplate.js";

/** create a new prefix scan shader! */
export function prefixScan<T>(device: GPUDevice, config: ScannerConfig): ScannerApi {
  return null as any;
}

export type ValueOrFn<T> = T | (() => T);

export interface ScannerConfig {
  /** type of scan */
  readonly template: ScanTemplate;

  /** source data to be scanned */
  src: ValueOrFn<GPUBuffer>;

  /** initial value for scan (defaults to template identity) */
  initialValue?: ValueOrFn<number>; // LATER support non numeric sources

  /** Inclusive scan accumulates a binary operation across all source elements. 
   * Exclusive scan accumulates a binary operation across source elements, using initialValue 
   * as the first element and stopping before the final source element. 
   */
  exclusive?: boolean;

  /** start index in src buffer of range to scan (0 if undefined) */
  start?: ValueOrFn<number>;

  /** end index (exclusive) in src buffer (src.length if undefined) */
  end?: ValueOrFn<number>;

  /** attach this debug label to gpu objects */
  readonly label?: string;

  /** cache for GPUComputePipeline or GPURenderPipeline */
  pipelineCache?: <T extends object>() => Cache<T>; 

  /* defaults to max workgroup size (setting manually is useful for testing) */
  workgroupLength?: number;
}

/** API use the scanner */
export interface ScannerApi extends ComposableShader, ScannerConfig {
  /** launch an immediate scan, returning the result in an array */
  scan(): Promise<number[]>;

  /** buffer containing scanned results on GPU */
  readonly result: GPUBuffer;

  /** destroy the scanResult buffer (or any other buffers allocated internally) */
  destroy(): void;
}

/**
 * All core shaders implement this, so users can configure their shaders and have a 'machine'
 * that runs a whole bunch fo shaders.
 */
export interface ComposableShader {
  commands(encoder: GPUCommandEncoder): void;
}

/** API for pluggable cache */
export interface Cache<V extends object> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
}

/* --- examples --- */
/** an example showing use of the scan api to run, rerun, modify params, etc. */
async function example(): Promise<void> {
  const config: ScannerConfig = { src: null as any, template: sumU32 };
  const device: GPUDevice = null as any;
  const scanner = prefixScan(device, config);

  // run the scanner and fetch the result
  const result = await scanner.scan();

  // run again on the same buffer (i.e. after changing src buffer)
  const result2 = await scanner.scan();

  // scan a different a buffer
  const newBuf: GPUBuffer = null as any;
  scanner.src = newBuf;
  const result3 = await scanner.scan();

  // scan a different range in the same burger
  scanner.start = 200;
  const result4 = await scanner.scan();
}

/** an example showing use of the scan api to run, rerun, modify params, etc. */
function composedExample(): void {
  const config: ScannerConfig = { src: null as any, template: sumU32 };
  const device: GPUDevice = null as any;
  const scan = prefixScan(device, config);
  const postScan = null as any; // a pretend shader
  const preScan = null as any; // .
  const shaders = [preScan, scan, postScan];

  // run all the shaders
  const encoder = device.createCommandEncoder();
  shaders.forEach(s => s.commands(encoder));
  device.queue.submit([encoder.finish()]);
}
