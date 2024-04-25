import {
  ShaderGroup,
  copyBuffer,
  labeledGpuDevice,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withLeakTrack,
} from "thimbleberry";
import { WorkgroupScan } from "../../src/scan/WorkgroupScan.js";
import { makeBuffer } from "./util/MakeBuffer.js";
import { exclusiveSum, inclusiveSum } from "./util/PrefixSum.js";

it.only("workgroup scan one evenly sized buffer, with middle layers", async () => {
  console.clear();
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());

    const srcData = [0, 1, 2, 3, 4, 5, 6, 7];
    await withLeakTrack(async () => {
      const scan = new WorkgroupScan({
        device,
        source: makeBuffer(device, srcData, "source", Uint32Array),
        emitBlockSums: true,
        forceWorkgroupLength: 8,
      });
      trackUse(scan);
      const shaderGroup = new ShaderGroup(device, scan);
      shaderGroup.dispatch();

      const prefixes = await copyBuffer(device, scan.prefixScan);
      expect(prefixes).to.deep.equal([0, 1, 3, 6, 10, 15, 21, 28]);
      const blockSums = await copyBuffer(device, scan.blockSums);
      expect(blockSums).to.deep.equal([28]);

      trackRelease(scan);
    });
  });
});

it("workgroup scan one evenly sized buffer, two workgroups", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());

    const srcData = [0, 1, 2, 3, 4, 5, 6, 7];
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: true,
      forceWorkgroupLength: 4,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();

    const blockSums = await copyBuffer(device, scan.blockSums);
    expect(blockSums).to.deep.equal([6, 22]);
    const prefixScan = await copyBuffer(device, scan.prefixScan);
    expect(prefixScan).to.deep.equal([0, 1, 3, 6, 4, 9, 15, 22]);
  });
});

it("workgroup scan one unevenly sized buffer", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());

    const srcData = [0, 1, 2, 3, 4, 5, 6];
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: true,
      forceWorkgroupLength: 8,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();

    const prefixScan = await copyBuffer(device, scan.prefixScan);
    expect(prefixScan).to.deep.equal([0, 1, 3, 6, 10, 15, 21]);
    const blockSums = await copyBuffer(device, scan.blockSums);
    expect(blockSums).to.deep.equal([21]);
  });
});

it("workgroup scan one unevenly sized buffer, two workgroups", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());

    const srcData = [0, 1, 2, 3, 4, 5, 6];
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: true,
      forceWorkgroupLength: 4,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();

    const prefixScan = await copyBuffer(device, scan.prefixScan);
    expect(prefixScan).to.deep.equal([0, 1, 3, 6, 4, 9, 15]); // prefix sums within each workgroup block
    const blockSums = await copyBuffer(device, scan.blockSums);
    expect(blockSums).to.deep.equal([6, 15]);
  });
});

it("workgroup exlusive scan, src smaller than workgroup", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const srcData = [1, 2, 3];
    const initialValue = 9;
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: false,
      forceWorkgroupLength: 4,
      exclusiveSmall: true,
      initialValue,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();
    const expected = exclusiveSum(srcData, initialValue);

    const prefixScan = await copyBuffer(device, scan.prefixScan);
    expect(prefixScan).to.deep.equal(expected);
  });
});

it("workgroup exclusive scan, with middle layers", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const srcData = [1, 2, 3, 4, 5, 6, 7];
    const initialValue = 9;
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: false,
      forceWorkgroupLength: 8,
      exclusiveSmall: true,
      initialValue,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();
    const expected = exclusiveSum(srcData, initialValue);
    const prefixScan = await copyBuffer(device, scan.prefixScan);
    expect(prefixScan).to.deep.equal(expected);
  });
});

it("workgroup with offsets", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const srcData = [1, 2, 3, 4, 5, 6, 7];
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: true,
      forceWorkgroupLength: 4,
      forceMaxWorkgroups: 1,
      sourceOffset: 4,
      scanOffset: 4,
      blockSumsOffset: 1,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();

    const expected = inclusiveSum(srcData.slice(4));
    const prefixScan = await copyBuffer(device, scan.prefixScan);
    const blockSums = await copyBuffer(device, scan.blockSums);
    expect(prefixScan.slice(4)).to.deep.equal(expected);
    expect(blockSums.slice(1)).to.deep.equal(expected.slice(-1));
  });
});

it("workgroup with generated offsets for workgroups > max", async () => {
  await withAsyncUsage(async () => {
    const device = trackUse(await labeledGpuDevice());
    const srcData = [1, 2, 3, 4, 5, 6, 7];
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: true,
      forceWorkgroupLength: 4,
      forceMaxWorkgroups: 1,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();

    const expected1 = inclusiveSum(srcData.slice(0, 4));
    const expected2 = inclusiveSum(srcData.slice(4));

    const prefixScan = await copyBuffer(device, scan.prefixScan);
    const blockSums = await copyBuffer(device, scan.blockSums);
    expect(prefixScan).to.deep.equal([...expected1, ...expected2]);
    expect(blockSums).to.deep.equal([...expected1.slice(-1), ...expected2.slice(-1)]);
  });
});
