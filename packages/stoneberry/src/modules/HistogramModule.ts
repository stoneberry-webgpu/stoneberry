import { replacer } from "wgsl-linker/templates";
import { BinOpModule } from "../util/BinOpModules.js";
import histogramWgsl from "./HistogramOps.wgsl?raw";

export interface HistogramModule extends BinOpModule {
  buckets: number;
}

export function histogramModule(   
  buckets: number,
): HistogramModule {
  const params = { buckets };
  // TODO is this necessary? it should be handled by the linker anyway..
  const wgsl = replacer(histogramWgsl, params); 

  return {
    buckets,
    wgsl,
    outputElementSize: 4 * buckets,
    inputElementSize: 4,
    outputElements: "u32",
  };

}
 
