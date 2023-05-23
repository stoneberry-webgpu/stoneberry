import {
  ShaderGroup,
  labeledGpuDevice,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withBufferCopy,
  withLeakTrack,
} from "thimbleberry";
import { sumU32 } from "../../src/scan/ScanTemplate.js";
import { PrefixScan } from "../../src/scan/PrefixScan.js";
import { makeBuffer } from "./util/MakeBuffer.js";
import { exclusiveSum, inclusiveSum } from "./util/PrefixSum.js";

it("scan api", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const srcData = [0, 1, 2, 3, 4, 5, 6];
    const expected = inclusiveSum(srcData);
    const src = makeBuffer(device, srcData, "source", Uint32Array);

    const scan = new PrefixScan({ device, src });
    const result = await scan.scan();

    expect(result).deep.equals(expected);
  });
});

it("scan sequence: unevenly sized buffer, two workgroups, one level block scanning", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = [0, 1, 2, 3, 4, 5, 6];

    const scan = new PrefixScan({
      device,
      src: makeBuffer(device, srcData, "source", Uint32Array),
      template: sumU32,
      workgroupLength: 4,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();

    // validate result
    const expected = inclusiveSum(srcData);
    await withBufferCopy(device, scan.result, "u32", data => {
      expect([...data]).deep.equals(expected);
    });

    // check internal state too
    await withBufferCopy(device, scan._sourceScan.blockSums, "u32", data => {
      expect([...data]).deep.equals([6, 15]);
    });
    await withBufferCopy(device, scan._blockScans[0].prefixScan, "u32", data => {
      expect([...data]).deep.equals([6, 21]);
    });
  });
});

it("scan sequence: large buffer, two levels of block scanning", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = Array.from({ length: 32 })
      .fill(0)
      .map((_, i) => i);

    const scan = new PrefixScan({
      device,
      src: makeBuffer(device, srcData, "source", Uint32Array),
      template: sumU32,
      workgroupLength: 4,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();

    const expected = inclusiveSum(srcData);
    await withBufferCopy(device, scan.result, "u32", data => {
      expect([...data]).deep.equals(expected);
    });
  });
});

it("scan sequence: large buffer, three levels of block scanning", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = Array.from({ length: 128 })
      .fill(0)
      .map((_, i) => i);

    await withLeakTrack(async () => {
      const scan = new PrefixScan({
        device,
        src: makeBuffer(device, srcData, "source", Uint32Array),
        template: sumU32,
        workgroupLength: 4,
      });
      trackUse(scan);
      const shaderGroup = new ShaderGroup(device, scan);
      shaderGroup.dispatch();

      const expected = inclusiveSum(srcData);
      await withBufferCopy(device, scan.result, "u32", data => {
        expect([...data]).deep.equals(expected);
      });
      trackRelease(scan);
    });
  });
});

it("exclusive scan small", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const srcData = [0, 1, 2, 3];
    const initialValue = 37;
    const expected = exclusiveSum(srcData, 37);
    const src = makeBuffer(device, srcData, "source", Uint32Array);

    const scan = new PrefixScan({
      device,
      src,
      workgroupLength: 4,
      exclusive: true,
      initialValue,
    });
    const result = await scan.scan();

    expect(result).deep.equals(expected);
  });
});

it("exclusive scan large", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const srcData = [0, 1, 2, 3, 4, 5, 6];
    const initialValue = 37;
    const expected = exclusiveSum(srcData, 37);
    const src = makeBuffer(device, srcData, "source", Uint32Array);

    const scan = new PrefixScan({
      device,
      src,
      workgroupLength: 4,
      exclusive: true,
      initialValue,
    });
    const result = await scan.scan();

    expect(result).deep.equals(expected);
  });
});
