import { GPUElementFormat } from "thimbleberry";

/** Snippets of wgsl text to substitue in the wgsl shader for given scan type */
export interface BinOpTemplate {
  /** combine two elements, e.g. sum. aka flatMap, join */
  binaryOp: string;

  /** return identity element, e.g. zero.  */
  identityOp: string;

  /** load an element from the source buffer */
  loadOp: string;

  /** define format of elements in source buffer */
  inputStruct: string;

  /** define format of elements in the result buffer */
  outputStruct: string;

  /** format of output elements, required for copying results back to cpu */
  outputElements?: GPUElementFormat;

  /** size of output structure in bytes */
  outputElementSize: number; 

  /** size of input structure in bytes */
  inputElementSize: number; 
}

/** extended wgsl substitutions that also support creation from internal elements */
export interface BinOpCreateTemplate extends BinOpTemplate {
  /** create our output structure from an internal value */
  createOp: string;  
}

/** prefix sum template for unsigned 32 bit values as input and output */
export const sumU32: BinOpCreateTemplate = {
  outputElementSize: 4,
  inputElementSize: 4,
  binaryOp: "return Output(a.sum + b.sum);",
  identityOp: "return Output(0);",
  loadOp: "return Output(a.sum);",
  inputStruct: "sum: u32,",
  outputStruct: "sum: u32,",
  outputElements: "u32",
  createOp: "return Output(a);",
};

export const sumF32: BinOpCreateTemplate = {
  inputElementSize: 4,
  outputElementSize: 4,
  binaryOp: "return Output(a.sum + b.sum);",
  identityOp: "return Output(0);",
  loadOp: "return Output(a.sum);",
  inputStruct: "sum: f32,",
  outputStruct: "sum: f32,",
  outputElements: "f32",
  createOp: "return Output(a);",
};

export const minMaxF32: BinOpCreateTemplate = {
  inputElementSize: 8,
  outputElementSize: 8,
  outputElements: "f32",
  outputStruct: "min: f32, max: f32,",
  inputStruct: "min: f32, max: f32,",
  binaryOp: "return Output(min(a.min, b.min), max(a.max, b.max));",
  identityOp: "return Output(1e38, -1e38);",
  loadOp: "return Output(a.min, a.max);", 
  createOp: `
    if (a > 0.0) {
        return Output(a, a);
    } else {
        return identityOp();
    }
    `
};

export const maxF32: BinOpCreateTemplate = {
  inputElementSize: 4,
  outputElementSize: 4,
  outputElements: "f32",
  outputStruct: "max: f32,",
  inputStruct: "max: f32,",
  createOp: "return Output(a);",
  binaryOp: "return Output(max(a.max, b.max));",
  identityOp: "return Output(0.0);",
  loadOp: "return Output(a.max);"
};
