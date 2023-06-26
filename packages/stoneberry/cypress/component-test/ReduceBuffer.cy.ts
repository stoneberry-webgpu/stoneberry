import {
  ReduceBuffer,
} from "stoneberry/reduce-buffer";
import {
  labeledGpuDevice,
  partitionBySize,
  ShaderGroup,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withBufferCopy,
  withLeakTrack,
} from "thimbleberry";
import { makeBuffer } from "./util/MakeBuffer";
import { maxF32, minMaxF32, sumF32 } from "../../src/util/BinOpTemplate.js";

it ("sum, simple api", async () => {
  await withAsyncUsage(async () => {

  });
});

it.only("buffer reduce sum, two dispatches", async () => {
  console.clear();
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const sourceData = [0, 1, 2, 3, 4, 5, 6, 7];
    await withLeakTrack(async () => {
      const shader = new ReduceBuffer({
        device,
        source: makeBuffer(device, sourceData, "source buffer", Float32Array),
        dispatchLength: 2,
        blockLength: 2,
        workgroupLength: 2,
        template: sumF32,
      });
      trackUse(shader);
      (new ShaderGroup(device, shader)).dispatch();

      const expected = sourceData.reduce((a, b) => a + b);

      await withBufferCopy(device, shader.result, "f32", data => {
        expect([...data]).deep.eq([expected]);
      });
      trackRelease(shader);
    });
  });
});

it("buffer reduce max, two dispatches", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const sourceData = [0, 1, 2, 3, 4, 5, 6, 7];
    const shader = new ReduceBuffer({
      device,
      source: makeBuffer(device, sourceData, "source buffer", Float32Array),
      dispatchLength: 2,
      blockLength: 2,
      workgroupLength: 2,
      template: maxF32,
    });
    const shaderGroup = new ShaderGroup(device, shader);
    shaderGroup.dispatch();

    const elemsPerDispatch = shader.blockLength * shader.workgroupLength!;
    const expected = [...partitionBySize(sourceData, elemsPerDispatch)].map(part =>
      part.reduce((a, b) => Math.max(a, b))
    );

    await withBufferCopy(device, shader.result, "f32", data => {
      expect([...data]).deep.eq(expected);
    });
  });
});

it("buffer reduce min/max, two dispatches", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    // uneven number of min/max pairs
    const sourceData = [
      [1e8, -1e8],
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [1, 6],
    ].flat();
    const shader = new ReduceBuffer({
      device,
      source: makeBuffer(device, sourceData, "source buffer", Float32Array),
      dispatchLength: 2,
      blockLength: 2,
      workgroupLength: 2,
      template: minMaxF32,
    });

    const shaderGroup = new ShaderGroup(device, shader);
    shaderGroup.dispatch();

    await withBufferCopy(device, shader.result, "f32", data => {
      expect([...data]).deep.eq([1, 3, 1, 6]);
    });
  });
});
