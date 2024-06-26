import {
  ShaderGroup,
  copyBuffer,
  labeledGpuDevice,
  makeTexture,
  trackRelease,
  trackUse,
  withAsyncUsage,
} from "thimbleberry";
import { makeBuffer } from "./util/MakeBuffer";
import { TextureToHistograms } from "../../src/histogram-texture/TextureToHistograms.js";
import { histogramModule } from "../../src/binop/HistogramModule.js";

it("texture to one histogram, one thread", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const histogramSize = 4;
    const sourceData = [
      [1, 1],
      [2, 3],
    ];
    const source = makeTexture(device, sourceData, "r32uint");
    const shader = new TextureToHistograms({
      device,
      source,
      minMaxBuffer: makeBuffer(device, [1, 4], "minmax", Uint32Array),
      histogramOps: histogramModule(histogramSize),
      bucketSums: true,
    });
    trackUse(shader);

    const group = new ShaderGroup(device, shader);
    group.dispatch();

    const counts = await copyBuffer(device, shader.histogramsResult, "u32");
    const sums = await copyBuffer(device, shader.sumsResult, "u32");
    expect(counts).deep.equals([2, 1, 1, 0]);
    expect(sums).deep.equals([2, 2, 3, 0]);

    trackRelease(shader);
  });
});

it("texture to one histograms, two threads", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const minMaxBuffer = makeBuffer(device, [1, 4], "minmax", Uint32Array);
    const histogramSize = 4;
    const histogramOps = histogramModule(histogramSize);
    const sourceData = [
      [1, 1, 3, 4],
      [2, 3, 4, 4],
    ];
    const source = makeTexture(device, sourceData, "r32uint");
    const shader = new TextureToHistograms({
      device,
      source,
      minMaxBuffer,
      histogramOps,
      blockSize: [2, 2],
      forceWorkgroupSize: [2, 2],
      bucketSums: true,
    });
    trackUse(shader);

    const group = new ShaderGroup(device, shader);
    group.dispatch();

    const counts = await copyBuffer(device, shader.histogramsResult, "u32");
    const sums = await copyBuffer(device, shader.sumsResult, "u32");
    expect(counts).deep.equals([2, 1, 2, 3]);
    expect(sums).deep.equals([2, 2, 6, 12]);

    trackRelease(shader);
  });
});

it("texture to two histograms, two dispatches", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const minMaxBuffer = makeBuffer(device, [1, 4], "minmax", Uint32Array);
    const histogramSize = 4;
    const histogramOps = histogramModule(histogramSize);
    const sourceData = [
      [1, 1, 3, 4],
      [2, 3, 4, 4],
    ];
    const source = makeTexture(device, sourceData, "r32uint");
    const shader = new TextureToHistograms({
      device,
      source,
      minMaxBuffer,
      histogramOps,
      blockSize: [2, 2],
      forceWorkgroupSize: [1, 1],
      bucketSums: true,
    });
    trackUse(shader);

    const group = new ShaderGroup(device, shader);
    group.dispatch();

    const counts = await copyBuffer(device, shader.histogramsResult, "u32");
    const sums = await copyBuffer(device, shader.sumsResult, "u32");
    expect(counts).deep.equals([2, 1, 1, 0, 0, 0, 1, 3]);
    expect(sums).deep.equals([2, 2, 3, 0, 0, 0, 3, 12]);

    trackRelease(shader);
  });
});

it("texture to one histogram, no sums", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const minMaxBuffer = makeBuffer(device, [1, 4], "minmax", Uint32Array);
    const histogramSize = 4;
    const histogramOps = histogramModule(histogramSize);
    const sourceData = [
      [1, 1],
      [2, 3],
    ];
    const source = makeTexture(device, sourceData, "r32uint");
    const shader = new TextureToHistograms({
      device,
      source,
      minMaxBuffer,
      histogramOps,
      bucketSums: false,
    });
    trackUse(shader);

    const group = new ShaderGroup(device, shader);
    group.dispatch();

    const counts = await copyBuffer(device, shader.histogramsResult, "u32");
    expect(counts).deep.equals([2, 1, 1, 0]);

    trackRelease(shader);
  });
});

it("texture to one histogram, saturateMax", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const minMaxBuffer = makeBuffer(device, [1, 4], "minmax", Uint32Array);
    const histogramSize = 4;
    const histogramOps = histogramModule(histogramSize);
    const sourceData = [
      [1, 1],
      [2, 10],
    ];
    const source = makeTexture(device, sourceData, "r32uint");
    const shader = new TextureToHistograms({
      device,
      source,
      minMaxBuffer,
      histogramOps,
      bucketSums: false,
      saturateMax: true,
    });
    trackUse(shader);

    const group = new ShaderGroup(device, shader);
    group.dispatch();

    const counts = await copyBuffer(device, shader.histogramsResult, "u32");
    expect(counts).deep.equals([2, 1, 0, 1]);

    trackRelease(shader);
  });
});

it("texture to one histogram, no saturateMax", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const minMaxBuffer = makeBuffer(device, [1, 4], "minmax", Uint32Array);
    const histogramSize = 4;
    const histogramOps = histogramModule(histogramSize);
    const sourceData = [
      [1, 1],
      [2, 10],
    ];
    const source = makeTexture(device, sourceData, "r32uint");
    const shader = new TextureToHistograms({
      device,
      source,
      minMaxBuffer,
      histogramOps,
      bucketSums: false,
    });
    trackUse(shader);

    const group = new ShaderGroup(device, shader);
    group.dispatch();

    const counts = await copyBuffer(device, shader.histogramsResult, "u32");
    expect(counts).deep.equals([2, 1, 0, 0]);

    trackRelease(shader);
  });
});

it("texture to one histogram, float texture", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const histogramSize = 4;
    const sourceData = [
      [1, 1],
      [2, 3],
    ];
    const source = makeTexture(device, sourceData, "r32float");
    const shader = new TextureToHistograms({
      device,
      source,
      minMaxBuffer: makeBuffer(device, [1, 4], "minmax", Float32Array),
      histogramOps: histogramModule(histogramSize),
    });
    trackUse(shader);

    const group = new ShaderGroup(device, shader);
    group.dispatch();

    const counts = await copyBuffer(device, shader.histogramsResult, "u32");
    expect(counts).deep.equals([2, 1, 1, 0]);

    trackRelease(shader);
  });
});