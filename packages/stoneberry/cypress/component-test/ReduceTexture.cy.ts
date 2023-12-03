import {
  labeledGpuDevice,
  make3dSequence,
  makeTexture,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withLeakTrack
} from "thimbleberry";
import { sumF32 } from "../../src/util/BinOpModules.js";
import { ReduceTexture } from "./../../src/reduce-texture/ReduceTexture";
import { sumReds } from "./util/Reductions.js";

it("reduce texture, no internal reduction", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = make3dSequence([4, 4]);
    const source = makeTexture(device, srcData, "rgba32float");
    await withLeakTrack(async () => {
      const shader = new ReduceTexture({
        device,
        source,
        blockSize: [2, 2],
        reduceTemplate: sumF32,
        loadComponent: "r",
      });
      trackUse(shader);
      const expected = sumReds(srcData);
      const result = await shader.reduce();
      expect(result).deep.eq([expected]);

      trackRelease(shader);
    });
  });
});

it("reduce texture, with buffer reduction", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = make3dSequence([8, 8]);
    const source = makeTexture(device, srcData, "rgba32float");
    await withLeakTrack(async () => {
      const shader = new ReduceTexture({
        device,
        source,
        blockSize: [2, 2],
        bufferBlockLength: 4,
        forceWorkgroupSize: [2, 2],
        reduceTemplate: sumF32,
        loadComponent: "r",
      });
      trackUse(shader);
      const result = await shader.reduce();

      const expected = sumReds(srcData);
      expect(result).deep.eq([expected]);
      trackRelease(shader);
    });
  });
});
