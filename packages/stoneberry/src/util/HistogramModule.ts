import { applyTemplate } from "wgsl-linker/replace-template";
import { BinOpModule } from "./BinOpModules.js";
import histogramWgsl from "./HistogramOps.wgsl?raw";

export interface HistogramTemplate2 extends BinOpModule {
  buckets: number;
}

export function histogramTemplate(   // TODO rename
  buckets: number,
): HistogramTemplate2 {
  const params = { buckets };
  const wgsl = applyTemplate(histogramWgsl, params);

  return {
    buckets,
    wgsl,
    outputElementSize: 4 * buckets,
    inputElementSize: 4,
    outputElements: "u32",
  };

}
 
