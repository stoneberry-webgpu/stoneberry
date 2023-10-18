import {
  labeledGpuDevice,
  printTexture,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withLeakTrack
} from "thimbleberry";
import { histogramTemplate } from '../../src/util/HistogramTemplate.js';
import { HistogramTexture } from './../../src/histogram-texture/HistogramTexture';
import { makeTexture } from "./util/MakeTexture.js";

it("histogram texture, no internal reduction", async () => {
  console.clear();
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const sourceData = [
      [1, 1],
      [2, 3],
    ];
    const source = makeTexture(device, sourceData, "r32uint");
    await printTexture(device, source, 0);
    await withLeakTrack(async () => {
      const shader = new HistogramTexture({
        device,
        source,
        blockSize: [2, 2],
        histogramTemplate: histogramTemplate(4, "u32"),
        loadComponent: "r",
        range: [1, 10],
      });
      trackUse(shader);
      const result = await shader.histogram();
      console.log("result:", result);

      trackRelease(shader);
    });
  });
});

// TODO test various sizes
// TODO test sint texture
// TODO test uint texture
// TODO test 8bit texture