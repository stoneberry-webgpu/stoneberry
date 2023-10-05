import {
  labeledGpuDevice,
  loadRedComponent,
  printBuffer,
  printTexture,
  ShaderGroup,
  trackRelease,
  trackUse,
  Vec2,
  withAsyncUsage,
  withBufferCopy,
  withLeakTrack,
} from "thimbleberry";
import { minMaxF32, sumF32 } from "../../src/util/BinOpTemplate.js";
import { ReduceTextureToBuffer } from "./../../src/reduce-texture/ReduceTextureToBuffer";
import { make3dSequence, makeTexture } from "./util/MakeTexture.js";

it("reduce texture to buffer, workgroup size = 1", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = make3dSequence([4, 4], 4);
    const source = makeTexture(device, srcData, "rgba32float");
    await withLeakTrack(async () => {
      const tr = new ReduceTextureToBuffer({
        device,
        source,
        blockSize: [2, 2],
        workgroupSize: [1, 1],
        reduceTemplate: sumF32,
        loadTemplate: loadRedComponent,
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

    const srcData = make3dSequence([4, 4], 4);
    const source = makeTexture(device, srcData, "rgba32float");
    await withLeakTrack(async () => {
      const tr = new ReduceTextureToBuffer({
        device,
        source,
        blockSize: [2, 2],
        workgroupSize: [2, 2], // larger workgroup size, so reduce work buffer to out buffer
        reduceTemplate: sumF32,
        loadTemplate: loadRedComponent,
      });
      trackUse(tr);
      const shaderGroup = new ShaderGroup(device, tr);
      shaderGroup.dispatch();

      // await printTexture(device, source, 0);
      // await printBuffer(device, tr.reducedResult, "f32");
      const expectedSum = sumReds(srcData);
      await withBufferCopy(device, tr.reducedResult, "f32", data => {
        expect([...data]).deep.eq([expectedSum]);
      });
      trackRelease(tr);
    });
  });
});

it.only("reduce texture to buffer, min/max workgroup size = 4", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = make3dSequence([4, 4], 4);
    const source = makeTexture(device, srcData, "rgba32float");
    await withLeakTrack(async () => {
      const tr = new ReduceTextureToBuffer({
        device,
        source,
        blockSize: [2, 2],
        workgroupSize: [2, 2],
        reduceTemplate: minMaxF32,
        loadTemplate: loadRedComponent,
      });
      trackUse(tr);
      const shaderGroup = new ShaderGroup(device, tr);
      shaderGroup.dispatch();

      const expected = minMaxPositiveReds(srcData);
      await printTexture(device, source, 0);
      await printBuffer(device, tr.reducedResult, "f32");
      await withBufferCopy(device, tr.reducedResult, "f32", data => {
        expect([...data]).deep.eq(expected);
      });
      trackRelease(tr);
    });
  });
});

function sumReds(data: number[][][]): number {
  const reds = data.flatMap(row => row.map(col => col[0]));
  return reds.reduce((a, b) => a + b);
}

function minMaxPositiveReds(data: number[][][]): Vec2 {
  const reds = data.flatMap(row => row.map(col => col[0]));
  const min = reds.reduce((a, b) => (b <= 0 ? a : Math.min(a, b)), 1e38);
  const max = reds.reduce((a, b) => Math.max(a, b));
  return [min, max];
}
