import { GPUElementFormat } from "thimbleberry";

/** Snippets of wgsl text to substitue in the wgsl shader for given scan type */
export interface BinOpModule {
  wgsl: string;

  /** size of output structure in bytes */
  outputElementSize: number;

  /** size of input structure in bytes */
  inputElementSize: number;

  /** format of output elements, required for copying results back to cpu */
  outputElements?: GPUElementFormat;
}

