import { simpleTemplate } from "wgsl-linker/templates";
import { preProcess } from "wgsl-linker";
import { BinOpModule } from "../util/BinOpModules.js";
import histogramWgsl from "./HistogramOps.wgsl?raw";

export interface HistogramModule extends BinOpModule {
  buckets: number;
}

export function histogramModule(buckets: number): HistogramModule {
  const params = { buckets };
  const templates = new Map([["simple", simpleTemplate.apply]]);
  const srcMap = preProcess(histogramWgsl, params, templates);

  return {
    buckets,
    wgsl: srcMap.dest,
    outputElementSize: 4 * buckets,
    inputElementSize: 4,
    outputElements: "u32",
  };
}
