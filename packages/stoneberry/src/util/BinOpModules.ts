import { GPUElementFormat } from "thimbleberry";
import sumF32wgsl from "./BinOpSumF32.wgsl?raw";
import sumU32wgsl from "./BinOpSumU32.wgsl?raw";
import maxF32wgsl from "./BinOpMaxF32.wgsl?raw";

/** Snippets of wgsl text to substitue in the wgsl shader for given scan type */
export interface BinOpTemplate2 extends OutputTemplate {
  wgsl: string;

  /** size of output structure in bytes */
  outputElementSize: number;

  /** size of input structure in bytes */
  inputElementSize: number;
}

export interface OutputTemplate {
  /** format of output elements, required for copying results back to cpu */
  outputElements?: GPUElementFormat;
}

export const sumU32: BinOpTemplate2 = {
  wgsl: sumU32wgsl,
  outputElementSize: 4,
  inputElementSize: 4,
  outputElements: "u32",
};

export const sumF32: BinOpTemplate2 = {
  wgsl: sumF32wgsl,
  inputElementSize: 4,
  outputElementSize: 4,
  outputElements: "f32",
};

export const maxF32: BinOpTemplate2 = {
  wgsl: maxF32wgsl,
  inputElementSize: 4,
  outputElementSize: 4,
  outputElements: "f32",
};
