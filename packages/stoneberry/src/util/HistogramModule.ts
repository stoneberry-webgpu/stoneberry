import { GPUElementFormat } from "thimbleberry";
import { BinOpTemplate2 } from "./BinOpModules.js";
import histogramWgsl from "./HistogramOps.wgsl?raw";
import { applyTemplate } from "wgsl-linker/replace-template";

export interface HistogramTemplate2 extends BinOpTemplate2 {
  buckets: number;
}

export function histogramTemplate(
  buckets: number,
  elemType: GPUElementFormat
): HistogramTemplate2 {
  const params = { buckets, elemType };
  const wgsl = applyTemplate(histogramWgsl, params);

  console.log(wgsl);

  return {
    buckets,
    wgsl,
    outputElementSize: 4 * buckets,
    inputElementSize: 4,
    outputElements: "u32",
  };

}
 
