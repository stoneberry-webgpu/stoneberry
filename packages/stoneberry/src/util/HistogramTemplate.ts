import { BinOpCreateTemplate } from "./BinOpTemplate.js";

export interface HistogramTemplate extends BinOpCreateTemplate {
  buckets: number;
}

export function makeHistogramTemplate(
  buckets: number,
  elemType: "f32" | "u32" | "i32"
): HistogramTemplate {
  return {
    inputElementSize: buckets * 4,
    outputElementSize: buckets * 4,
    outputElements: elemType,
    buckets,
    inputStruct: `histogram: array<${elemType}, ${buckets}>,`,
    outputStruct: `histogram: array<${elemType}, ${buckets}>,`,
    binaryOp: `
        var result: array<u32,${buckets}>; 
        for (var i = 0u; i < ${buckets}u; i = i + 1u) { 
            result[i] = a.histogram[i] + b.histogram[i];
        }
        return Output(result);
    `,
    identityOp: `
        return Output(array<u32,${buckets}>()); 
    `,
    loadOp: `
        return Output(a.histogram);
    `,
    createOp: "tbd",
  };
}
