import { GPUElementFormat } from "thimbleberry";
/** Snippets of wgsl text to substitue in the wgsl shader for given scan type */
export interface ScanTemplate {
  /** combine two elements, e.g. sum. aka flatMap, join */
  binaryOp: string;

  /** return identity element, e.g. zero.  */
  // TODO make dynamic
  identityOp: string;

  /** load an element from the source buffer */
  loadOp: string;

  /** define format of elements in source buffer */
  inputStruct: string;

  /** define format of elements in the result buffer */
  outputStruct: string;

  /** format of output elements, required for copying results back to cpu */
  outputElements?: GPUElementFormat;
}

/** prefix sum template for unsigned 32 bit values as input and output */
export const sumU32: ScanTemplate = {
  binaryOp: "return Output(a.sum + b.sum);",
  identityOp: "return Output(0);",
  loadOp: "return Output(a.sum);",
  inputStruct: "sum: u32,",
  outputStruct: "sum: u32,",
  outputElements: "u32",
};

export const sumF32: ScanTemplate = {
  binaryOp: "return Output(a.sum + b.sum);",
  identityOp: "return Output(0);",
  loadOp: "return Output(a.sum);",
  inputStruct: "sum: f32,",
  outputStruct: "sum: f32,",
  outputElements: "f32",
};
