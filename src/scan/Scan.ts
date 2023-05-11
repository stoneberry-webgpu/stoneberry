/**
 * A discussion sketch of the api for prefix scan.
 * TBD:
 *  . inclusive vs exclusive
 *  . initial value? - should this be dynamic or fixed in template?
 *  . generator for one workgroup size? - I don't understand this one fully.
 *  . support for a debug error context
 *  . sharing bind groups? - no proposal here
 */

import { ScanTemplate } from "./ScanTemplate.js";

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
