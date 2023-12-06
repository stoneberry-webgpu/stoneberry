import {
  copyBuffer,
  labeledGpuDevice,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withLeakTrack,
} from "thimbleberry";
import { histogramTemplate, HistogramTexture } from "stoneberry/histogram-texture";
import { makeTexture } from "thimbleberry";

it("histogram texture, no internal reduction", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const sourceData = [
      [1, 1],
      [2, 9],
    ];
    const source = makeTexture(device, sourceData, "r32uint");
    await withLeakTrack(async () => {
      const shader = new HistogramTexture({
        device,
        source,
        blockSize: [2, 2],
        histogramTemplate: histogramTemplate(4, "u32"),
        sourceComponent: "r",
        range: [1, 10],
      });
      trackUse(shader);
      const counts = await shader.histogram();
      expect(counts).deep.equals([3, 0, 0, 1]);

      trackRelease(shader);
    });
  });
});

it("histogram texture, with reduction", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const sourceData = [
      [1, 1, 3, 5],
      [2, 3, 8, 9],
    ];
    const source = makeTexture(device, sourceData, "r32uint");
    await withLeakTrack(async () => {
      const shader = new HistogramTexture({
        device,
        source,
        blockSize: [2, 2],
        forceWorkgroupSize: [1, 1],
        histogramTemplate: histogramTemplate(4, "u32"),
        sourceComponent: "r",
        range: [1, 10],
      });
      trackUse(shader);
      const result = await shader.histogram();
      expect(result).deep.equals([5, 1, 0, 2]);

      trackRelease(shader);
    });
  });
});

it("histogram texture, with reduction, float", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const sourceData = [
      [1, 1, 3, 5],
      [2, 3, 8, 9],
    ];
    const source = makeTexture(device, sourceData, "r32float");
    await withLeakTrack(async () => {
      const shader = new HistogramTexture({
        device,
        source,
        blockSize: [2, 2],
        forceWorkgroupSize: [1, 1],
        histogramTemplate: histogramTemplate(4, "u32"),
        sourceComponent: "r",
        range: [1, 10],
      });
      trackUse(shader);
      const result = await shader.histogram();
      expect(result).deep.equals([5, 1, 0, 2]);

      trackRelease(shader);
    });
  });
});

it("histogram texture, with reduction, r8uint", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const sourceData = [
      [1, 1, 3, 5],
      [2, 3, 8, 9],
    ];
    const source = makeTexture(device, sourceData, "r8uint");
    await withLeakTrack(async () => {
      const shader = new HistogramTexture({
        device,
        source,
        blockSize: [2, 2],
        forceWorkgroupSize: [1, 1],
        histogramTemplate: histogramTemplate(4, "u32"),
        sourceComponent: "r",
        range: [1, 10],
      });
      trackUse(shader);
      const result = await shader.histogram();
      expect(result).deep.equals([5, 1, 0, 2]);

      trackRelease(shader);
    });
  });
});

it("histogram texture, with reduction, r32sint", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const sourceData = [
      [-8, -3, 3, 5],
      [2, 3, 8, 9],
    ];
    const source = makeTexture(device, sourceData, "r32sint");
    await withLeakTrack(async () => {
      const shader = new HistogramTexture({
        device,
        source,
        blockSize: [2, 2],
        forceWorkgroupSize: [1, 1],
        histogramTemplate: histogramTemplate(4, "i32"),
        sourceComponent: "r",
        range: [-10, 10],
      });
      trackUse(shader);
      const result = await shader.histogram();
      expect(result).deep.equals([1, 1, 3, 3]);

      trackRelease(shader);
    });
  });
});

it("histogram texture, with reduction, with bucketSums", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const sourceData = [
      [1, 1, 3, 5],
      [2, 3, 8, 9],
    ];
    const source = makeTexture(device, sourceData, "r32uint");
    await withLeakTrack(async () => {
      const shader = new HistogramTexture({
        device,
        source,
        blockSize: [2, 2],
        forceWorkgroupSize: [1, 1],
        histogramTemplate: histogramTemplate(4, "u32"),
        sourceComponent: "r",
        range: [1, 10],
        bucketSums: true,
      });
      trackUse(shader);
      const result = await shader.histogram();
      expect(result).deep.equals([5, 1, 0, 2]);
      const sums = await copyBuffer(device, shader.sumsResult);
      expect(sums).deep.equals([10, 5, 0, 17]);

      trackRelease(shader);
    });
  });
});
