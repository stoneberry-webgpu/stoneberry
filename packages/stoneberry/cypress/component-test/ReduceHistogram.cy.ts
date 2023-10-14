import {
  labeledGpuDevice,
  printBuffer,
  trackRelease,
  trackUse,
  withAsyncUsage,
} from "thimbleberry";
import { ReduceHistogram } from "../../src/reduce-buffer/ReduceHistogram.js";
import { histogramTemplate } from "../../src/util/HistogramTemplate.js";
import { makeBuffer } from "./util/MakeBuffer";

it.only("reduce 2 histograms within the workgroup", async () => {
  console.clear();
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const histA = [1, 2, 3, 4];
    const histB = [5, 6, 7, 8];
    const sourceData = [...histA, ...histB];
    const source = makeBuffer(device, sourceData, "source buffer", Uint32Array);
    const histogramSize = 4;
    const template = histogramTemplate(histogramSize, "u32");
    const shader = new ReduceHistogram({ device, source, template, histogramSize });
    trackUse(shader);

    const result = await shader.reduce();
    await printBuffer(device, shader.debugBuffer);
    const expected = histA.map((a, i) => a + histB[i]);
    expect(result).deep.eq(expected);
    trackRelease(shader);
  });
});
