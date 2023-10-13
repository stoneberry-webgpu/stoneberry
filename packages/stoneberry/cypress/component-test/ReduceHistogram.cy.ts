import { labeledGpuDevice, trackRelease, trackUse, withAsyncUsage } from "thimbleberry";
import { ReduceHistogram } from "../../src/reduce-buffer/ReduceHistogram.js";
import { histogramTemplate } from "../../src/util/HistogramTemplate.js";
import { makeBuffer } from "./util/MakeBuffer";

it.only("simple histogram", async () => {
  console.clear();
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const sourceData = [0, 1, 2, 2, 3, 4, 4, 5, 5, 5];
    const source = makeBuffer(device, sourceData, "source buffer", Uint32Array);
    const template = histogramTemplate(8, "u32")
    const shader = new ReduceHistogram({ device, source, template});
    trackUse(shader);

    const result = await shader.reduce();
    const expected = sourceData.reduce((a, b) => a + b);
    expect(result).deep.eq([expected]);
    trackRelease(shader);
  });
});
