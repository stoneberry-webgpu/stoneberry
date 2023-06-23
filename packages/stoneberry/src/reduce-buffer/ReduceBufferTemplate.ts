import { BinOpTemplate } from "../util/BinOpTemplate.js";

/** wgsl text substitutions that define binary operations for reduce shader */
export interface ReduceBufferTemplate extends BinOpTemplate {
  /** create our ouput structure from an f32 */
  pureOp: string; 
}

export const sumTemplate: ReduceBufferTemplate = {
  elementSize: 4,
  outputStruct: "sum: f32,",
  inputStruct: "sum: f32,",
  pureOp: "return Output(a);",
  binaryOp: "return Output(a.sum + b.sum);",
  identityOp: "return Output(0.0);",
  loadOp: "return Output(a.sum);"
};

export const sumTemplateUnsigned: ReduceBufferTemplate = {
  elementSize: 4,
  outputStruct: "sum: u32,",
  inputStruct: "sum: u32,",
  pureOp: "return Output(a);",
  binaryOp: "return Output(a.sum + b.sum);",
  identityOp: "return Output(0);",
  loadOp: "return Output(a.sum);"
};

export const minMaxTemplate: ReduceBufferTemplate = {
  elementSize: 8,
  outputStruct: "min: f32, max: f32,",
  inputStruct: "min: f32, max: f32,",
  binaryOp: "return Output(min(a.min, b.min), max(a.max, b.max));",
  identityOp: "return Output(1e38, -1e38);",
  loadOp: "return Output(a.min, a.max);", // assumes Input is a struct with min and max
  pureOp: `
    if (a > 0.0) {
        return Output(a, a);
    } else {
        return identityOp();
    }
    `
};

export const maxTemplate: ReduceBufferTemplate = {
  elementSize: 4,
  outputStruct: "max: f32,",
  inputStruct: "max: f32,",
  pureOp: "return Output(a);",
  binaryOp: "return Output(max(a.max, b.max));",
  identityOp: "return Output(0.0);",
  loadOp: "return Output(a.max);"
};

// find min max of the alpha channel
export const minMaxAlphaTemplate: ReduceBufferTemplate = {
  elementSize: 8,
  outputStruct: "min: f32, max: f32,",
  inputStruct: "min: f32, max: f32,",
  binaryOp: "return Output(min(a.min, b.min), max(a.max, b.max));",
  identityOp: "return Output(1e38, -1e38);",
  loadOp: "return Output(a.min, a.max);", // assumes Input is a struct with min and max
  pureOp: `
    if (a > 0.0) {
        return Output(a, a);
    } else {
        return identityOp();
    }
    `
};
