import {
  ShaderGroup,
  copyBuffer,
  labeledGpuDevice,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withLeakTrack,
} from "thimbleberry";
import { PrefixScan } from "../../src/scan/PrefixScan.js";
import { makeBuffer } from "./util/MakeBuffer.js";
import { exclusiveSum, inclusiveSum } from "./util/PrefixSum.js";
import { sumU32 } from "../../src/binop/BinOpModuleSumU32.js";
import { sumF32 } from "../../src/binop/BinOpModuleSumF32.js";

it("scan api", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const srcData = [0, 1, 2, 3, 4, 5, 6];
    const expected = inclusiveSum(srcData);
    const source = makeBuffer(device, srcData, "source", Uint32Array);

    const scan = new PrefixScan({ device, source });
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
      source: makeBuffer(device, srcData, "source", Uint32Array),
      binOps: sumU32,
      forceWorkgroupLength: 4,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();

    // validate result
    const expected = inclusiveSum(srcData);
    const result = await copyBuffer(device, scan.result);
    expect([...result]).deep.equals(expected);

    // check internal state too
    const data = await copyBuffer(device, scan._sourceScan.blockSums);
    const blockScans = await copyBuffer(device, scan._blockScans[0].prefixScan);
    expect([...data]).deep.equals([6, 15]);
    expect([...blockScans]).deep.equals([6, 21]);
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
      source: makeBuffer(device, srcData, "source", Uint32Array),
      binOps: sumU32,
      forceWorkgroupLength: 4,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();

    const expected = inclusiveSum(srcData);
    const result = await copyBuffer(device, scan.result);
    expect([...result]).deep.equals(expected);
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
        source: makeBuffer(device, srcData, "source", Uint32Array),
        binOps: sumU32,
        forceWorkgroupLength: 4,
      });
      trackUse(scan);
      const shaderGroup = new ShaderGroup(device, scan);
      shaderGroup.dispatch();

      const expected = inclusiveSum(srcData);
      const result = await copyBuffer(device, scan.result);
      expect([...result]).deep.equals(expected);
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

    const scan = new PrefixScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      forceWorkgroupLength: 4,
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
    const expected = exclusiveSum(srcData, initialValue);

    const scan = new PrefixScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      forceWorkgroupLength: 4,
      exclusive: true,
      initialValue,
    });
    const result = await scan.scan();

    expect(result).deep.equals(expected);
  });
});

it("scan f32", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const srcData = [0, 1, 2, 3, 4, 5, 6];
    const expected = inclusiveSum(srcData);
    const source = makeBuffer(device, srcData, "source", Float32Array);

    const scan = new PrefixScan({ device, source, binOps: sumF32 });
    const result = await scan.scan();

    expect(result).deep.equals(expected);
  });
});

it("multi dispatch for large source", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const srcData = [0, 1, 2, 3, 4, 5, 6];
    const expected = inclusiveSum(srcData);
    const source = makeBuffer(device, srcData, "source", Uint32Array);

    const scan = new PrefixScan({ device, source, maxWorkgroups: 1, forceWorkgroupLength: 4 });
    const result = await scan.scan();

    expect(result).deep.equals(expected);
  });
});
