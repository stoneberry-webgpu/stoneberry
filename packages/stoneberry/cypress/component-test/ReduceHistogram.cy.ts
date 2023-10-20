import { makeHistogramTemplate } from "stoneberry/histogram-texture";
import {
  labeledGpuDevice,
  mapN,
  trackRelease,
  trackUse,
  withAsyncUsage,
} from "thimbleberry";
import { ReduceBuffer } from "stoneberry/reduce-buffer";
import { makeBuffer } from "./util/MakeBuffer";

it("reduce 2 histograms within one src block", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const histA = [1, 2, 3, 4];
    const histB = [5, 6, 7, 8];
    const sourceData = [...histA, ...histB];
    const source = makeBuffer(device, sourceData, "source buffer", Uint32Array);
    const histogramSize = 4;
    const template = makeHistogramTemplate(histogramSize, "u32");
    const shader = new ReduceBuffer({ device, source, template });
    trackUse(shader);

    const result = await shader.reduce();
    const expected = histA.map((a, i) => a + histB[i]);
    expect(result).deep.eq(expected);
    trackRelease(shader);
  });
});

it("reduce histograms across workgroup threads", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const histograms = mapN(4, i => [1 * i, 2, 3, 4]);
    const sourceData = histograms.flat(2);
    const source = makeBuffer(device, sourceData, "source buffer", Uint32Array);
    const histogramSize = 4;
    const template = makeHistogramTemplate(histogramSize, "u32");
    const shader = new ReduceBuffer({
      device,
      source,
      template,
      blockLength: 2,
    });
    trackUse(shader);

    const result = await shader.reduce();
    const expected = histograms.reduce((a, b) => a.map((v, i) => v + b[i]));
    expect(result).deep.eq(expected);
    trackRelease(shader);
  });
});

it("reduce histograms across workgroups (2nd layer)", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const histograms = mapN(8, i => [1 * i, 2, 3, 4]);
    const sourceData = histograms.flat(2);
    const source = makeBuffer(device, sourceData, "source buffer", Uint32Array);
    const histogramSize = 4;
    const template = makeHistogramTemplate(histogramSize, "u32");
    const shader = new ReduceBuffer({
      device,
      source,
      template,
      forceWorkgroupLength: 2,
      blockLength: 2,
    });
    trackUse(shader);

    const result = await shader.reduce();
    const expected = histograms.reduce((a, b) => a.map((v, i) => v + b[i]));
    expect(result).deep.eq(expected);
    trackRelease(shader);
  });
});
