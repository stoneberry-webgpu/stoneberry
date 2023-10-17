import {
  ShaderGroup,
  copyBuffer,
  labeledGpuDevice,
  printBuffer,
  printTexture,
  trackRelease,
  trackUse,
  withAsyncUsage,
} from "thimbleberry";
import { histogramTemplate } from "../../src/util/HistogramTemplate.js";
import { TextureToHistograms } from "./../../src/reduce-texture/TextureToHistograms";
import { makeBuffer } from "./util/MakeBuffer";
import { makeTexture } from "./util/MakeTexture.js";

it("texture to one histogram", async () => {
  console.clear();
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const minMaxBuffer = makeBuffer(device, [1, 4], "minmax", Uint32Array);
    const histogramSize = 4;
    const reduceTemplate = histogramTemplate(histogramSize, "u32");
    const sourceData = [
      [1, 1],
      [2, 3],
    ];
    const source = makeTexture(device, sourceData, "r32uint");
    await printTexture(device, source);
    const shader = new TextureToHistograms({
      device,
      source,
      minMaxBuffer,
      reduceTemplate,
      numBuckets: histogramSize,
    });
    trackUse(shader);

    const group = new ShaderGroup(device, shader);
    group.dispatch();

    const counts = await copyBuffer(device, shader.histogramsResult, "u32");
    const sums = await copyBuffer(device, shader.sumsResult, "u32");
    expect(counts).deep.equals([2, 1, 1, 0]);
    expect(sums).deep.equals([2, 2, 3, 0]);

    await printBuffer(device, shader.histogramsResult, "u32");
    await printBuffer(device, shader.sumsResult, "u32");
    await printBuffer(device, shader.debugBuffer);

    trackRelease(shader);
  });
});
