import {
  ShaderGroup,
  labeledGpuDevice,
  printBuffer,
  printTexture,
  trackRelease,
  trackUse,
  withAsyncUsage
} from "thimbleberry";
import { histogramTemplate } from "../../src/util/HistogramTemplate.js";
import { TextureToHistograms } from "./../../src/reduce-texture/TextureToHistograms";
import { makeBuffer } from "./util/MakeBuffer";
import { makeTexture } from "./util/MakeTexture.js";

it("texture to histogram", async () => {
  console.clear();
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const minMaxBuffer = makeBuffer(device, [1, 100], "minmax", Uint32Array);
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
    });
    trackUse(shader);

    const group = new ShaderGroup(device, shader);
    group.dispatch();

    await printBuffer(device, shader.histogramsResult);
    await printBuffer(device, shader.sumsResult);

    trackRelease(shader);
  });
});
