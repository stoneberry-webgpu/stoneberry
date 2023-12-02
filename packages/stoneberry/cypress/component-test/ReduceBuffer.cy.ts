import { ReduceBuffer } from "stoneberry/reduce-buffer";
import {
  labeledGpuDevice,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withLeakTrack
} from "thimbleberry";
import {
  maxF32,
  minMaxPositiveF32,
  sumF32,
  sumU32,
} from "../../src/util/BinOpModules.js";
import { makeBuffer } from "./util/MakeBuffer";

it("sum, simple api", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const sourceData = [0, 1, 2, 3, 4, 5, 6, 7];
    const source = makeBuffer(device, sourceData, "source buffer", Uint32Array);
    const shader = new ReduceBuffer({ device, source, template2: sumU32 });
    trackUse(shader);
    const result = await shader.reduce();

    const expected = sourceData.reduce((a, b) => a + b);
    expect(result).deep.eq([expected]);
    trackRelease(shader);
  });
});

it("buffer reduce sum, two dispatches", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());

    const sourceData = [0, 1, 2, 3, 4, 5, 6, 7];
    await withLeakTrack(async () => {
      const shader = new ReduceBuffer({
        device,
        source: makeBuffer(device, sourceData, "source buffer", Float32Array),
        blockLength: 2,
        forceWorkgroupLength: 2,
        template2: sumF32,
      });
      trackUse(shader);

      const result = await shader.reduce();
      const expected = sourceData.reduce((a, b) => a + b);
      expect(result).deep.eq([expected]);
      trackRelease(shader);
    });
  });
});

it("buffer reduce max, two dispatches", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());

    const sourceData = [0, 1, 2, 3, 4, 5, 6, 7];
    const shader = new ReduceBuffer({
      device,
      source: makeBuffer(device, sourceData, "source buffer", Float32Array),
      blockLength: 2,
      forceWorkgroupLength: 2,
      template2: maxF32,
    });

    const result = await shader.reduce();
    const expected = sourceData.reduce((a, b) => Math.max(a, b));

    expect(result).deep.eq([expected]);
  });
});

it("buffer reduce min/max, two dispatches", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());

    // uneven number of min/max pairs
    const sourceData = [
      [1e8, -1e8],
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [1, 6],
    ];
    const shader = new ReduceBuffer({
      device,
      source: makeBuffer(device, sourceData.flat(), "source buffer", Float32Array),
      blockLength: 2,
      forceWorkgroupLength: 2,
      template2: minMaxPositiveF32,
    });
    const result = await shader.reduce();

    const min = sourceData.map(([a]) => a).reduce((a, b) => Math.min(a, b));
    const max = sourceData.map(([, b]) => b).reduce((a, b) => Math.max(a, b));
    expect(result).deep.eq([min, max]);
  });
});

it("sourceOffset", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const sourceData = [0, 1, 2, 3, 4, 5, 6, 7];
    const source = makeBuffer(device, sourceData, "source buffer", Uint32Array);
    const shader = new ReduceBuffer({
      device,
      source,
      template2: sumU32,
      sourceOffset: 4,
    });
    trackUse(shader);

    const result = await shader.reduce();

    const expected = sourceData.slice(4).reduce((a, b) => a + b);
    expect(result).deep.eq([expected]);
    trackRelease(shader);
  });
});

it("2 workgroups > max (1)", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const sourceData = [0, 1, 2, 3, 4, 5, 6, 7];
    const source = makeBuffer(device, sourceData, "source buffer", Uint32Array);
    const shader = new ReduceBuffer({
      device,
      source,
      template2: sumU32,
      forceWorkgroupLength: 2,
      blockLength: 2,
      forceMaxWorkgroups: 1,
    });
    trackUse(shader);

    const result = await shader.reduce();

    const expected = sourceData.reduce((a, b) => a + b);
    expect(result).deep.eq([expected]);
    trackRelease(shader);
  });
});

it("4 dispatched workgroups > max (2), 2 threads/workgroup ", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const sourceData = Array.from({ length: 32 }).map((_, i) => i);
    const source = makeBuffer(device, sourceData, "source buffer", Uint32Array);
    const shader = new ReduceBuffer({
      device,
      source,
      template2: sumU32,
      forceWorkgroupLength: 2,
      blockLength: 2,
      forceMaxWorkgroups: 2,
    });
    trackUse(shader);

    const result = await shader.reduce();

    const expected = sourceData.reduce((a, b) => a + b);
    expect(result).deep.eq([expected]);
    trackRelease(shader);
  });
});
