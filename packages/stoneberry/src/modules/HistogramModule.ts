import { applyTemplate } from "wgsl-linker/replace-template";
import { BinOpModule } from "../util/BinOpModules.js";
import histogramWgsl from "./HistogramOps.wgsl?raw";

export interface HistogramModule extends BinOpModule {
  buckets: number;
}

export function histogramModule(   
  buckets: number,
): HistogramModule {
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
 
