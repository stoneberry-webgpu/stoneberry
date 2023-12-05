import {
  labeledGpuDevice,
  make2dSequence,
  make3dSequence,
  makeTexture,
  ShaderGroup,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withBufferCopy,
  withLeakTrack
} from "thimbleberry";
import { ReduceTextureToBuffer } from "../../src/reduce-texture/ReduceTextureToBuffer.js";
import { minMaxPositiveF32, sumF32, sumU32 } from "../../src/util/BinOpModules.js";
import { loadTexelCodeGen } from "../../src/util/LoadTemplate.js";
import { minMaxPositiveReds, sumReds } from "./util/Reductions.js";

it("reduce texture to buffer, workgroup size = 1", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = make3dSequence([4, 4]);
    const source = makeTexture(device, srcData, "rgba32float");
    await withLeakTrack(async () => {
      const tr = new ReduceTextureToBuffer({
        device,
        source,
        blockSize: [2, 2],
        forceWorkgroupSize: [1, 1],
        reduceTemplate: sumF32,
        loadComponent: loadTexelCodeGen("r"),
      });
      trackUse(tr);
      const shaderGroup = new ShaderGroup(device, tr);
      shaderGroup.dispatch();

      await withBufferCopy(device, tr.reducedResult, "f32", data => {
        expect([...data]).deep.eq([10, 18, 42, 50]);
      });
      trackRelease(tr);
    });
  });
});

it("reduce texture to buffer, workgroup size = 4", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = make3dSequence([4, 4]);
    const source = makeTexture(device, srcData, "rgba32float");
    await withLeakTrack(async () => {
      const tr = new ReduceTextureToBuffer({
        device,
        source,
        blockSize: [2, 2],
        forceWorkgroupSize: [2, 2], // shader will need reduce buffer to out buffer
        reduceTemplate: sumF32,
        loadComponent: loadTexelCodeGen("r"),
      });
      trackUse(tr);
      const shaderGroup = new ShaderGroup(device, tr);
      shaderGroup.dispatch();

      const expectedSum = sumReds(srcData);
      await withBufferCopy(device, tr.reducedResult, "f32", data => {
        expect([...data]).deep.eq([expectedSum]);
      });
      trackRelease(tr);
    });
  });
});

it("reduce texture to buffer, min/max workgroup size = 4", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = make3dSequence([4, 4]);
    const source = makeTexture(device, srcData, "rgba32float");
    await withLeakTrack(async () => {
      const tr = new ReduceTextureToBuffer({
        device,
        source,
        blockSize: [2, 2],
        forceWorkgroupSize: [2, 2],
        reduceTemplate: minMaxPositiveF32,
        loadComponent: loadTexelCodeGen("r"),
      });
      trackUse(tr);
      const shaderGroup = new ShaderGroup(device, tr);
      shaderGroup.dispatch();

      const expected = minMaxPositiveReds(srcData);
      await withBufferCopy(device, tr.reducedResult, "f32", data => {
        expect([...data]).deep.eq(expected);
      });
      trackRelease(tr);
    });
  });
});

it("reduce texture to buffer, r32uint", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = make2dSequence([4, 4]);
    const source = makeTexture(device, srcData, "r32uint");
    await withLeakTrack(async () => {
      const tr = new ReduceTextureToBuffer({
        device,
        source,
        blockSize: [2, 2],
        forceWorkgroupSize: [2, 2],
        reduceTemplate: sumU32,
        loadComponent: loadTexelCodeGen("r"),
      });
      trackUse(tr);
      const shaderGroup = new ShaderGroup(device, tr);
      shaderGroup.dispatch();

      const expected = srcData.flat(2).reduce((a, b) => a + b);
      await withBufferCopy(device, tr.reducedResult, "u32", data => {
        expect([...data]).deep.eq([expected]);
      });
      trackRelease(tr);
    });
  });
});
