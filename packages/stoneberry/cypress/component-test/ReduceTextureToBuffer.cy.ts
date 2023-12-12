import {
  copyBuffer,
  labeledGpuDevice,
  make2dSequence,
  make3dSequence,
  makeTexture,
  ShaderGroup,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withLeakTrack
} from "thimbleberry";
import { ReduceTextureToBuffer } from "../../src/reduce-texture/ReduceTextureToBuffer.js";
import { loadTexelCodeGen } from "../../src/util/GenerateLoadTexel.js";
import { minMaxReds, sumReds } from "./util/Reductions.js";
import { sumF32 } from "../../src/modules/BinOpModuleSumF32.js";
import { minMaxF32 } from "../../src/modules/BinOpModuleMinMaxF32.js";
import { sumU32 } from "../../src/modules/BinOpModuleSumU32.js";

it("reduce texture to buffer, workgroup size = 1", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = make3dSequence([4, 4]);
    const source = makeTexture(device, srcData, "rgba32float");
    await withLeakTrack(async () => {
      const rt = new ReduceTextureToBuffer({
        device,
        source,
        blockSize: [2, 2],
        forceWorkgroupSize: [1, 1],
        binOps: sumF32,
        loadComponent: loadTexelCodeGen("r"),
      });
      trackUse(rt);
      const shaderGroup = new ShaderGroup(device, rt);
      shaderGroup.dispatch();

      const data = await copyBuffer(device, rt.reducedResult, "f32");
      expect(data).deep.eq([10, 18, 42, 50]);
      trackRelease(rt);
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
        binOps: sumF32,
        loadComponent: loadTexelCodeGen("r"),
      });
      trackUse(tr);
      const shaderGroup = new ShaderGroup(device, tr);
      shaderGroup.dispatch();

      const expectedSum = sumReds(srcData);
      const data = await copyBuffer(device, tr.reducedResult, "f32");
      expect(data).deep.eq([expectedSum]);
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
      const rt = new ReduceTextureToBuffer({
        device,
        source,
        blockSize: [2, 2],
        forceWorkgroupSize: [2, 2],
        binOps: minMaxF32,
        loadComponent: loadTexelCodeGen("r", 2),
      });
      trackUse(rt);
      const shaderGroup = new ShaderGroup(device, rt);
      shaderGroup.dispatch();

      const expected = minMaxReds(srcData);
      const data = await copyBuffer(device, rt.reducedResult, "f32");
      expect(data).deep.eq(expected);
      trackRelease(rt);
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
      const rt = new ReduceTextureToBuffer({
        device,
        source,
        blockSize: [2, 2],
        forceWorkgroupSize: [2, 2],
        binOps: sumU32,
        loadComponent: loadTexelCodeGen("r"),
      });
      trackUse(rt);
      const shaderGroup = new ShaderGroup(device, rt);
      shaderGroup.dispatch();

      const expected = srcData.flat(2).reduce((a, b) => a + b);
      const data = await copyBuffer(device, rt.reducedResult, "u32");
      expect(data).deep.eq([expected]);
      trackRelease(rt);
    });
  });
});
