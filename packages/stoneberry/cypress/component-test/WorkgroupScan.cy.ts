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
import { exclusiveSum } from "./util/PrefixSum.js";

it("workgroup scan one evenly sized buffer, with middle layers", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();

    const srcData = [0, 1, 2, 3, 4, 5, 6, 7];
    await withLeakTrack(async () => {
      const scan = new WorkgroupScan({
        device,
        source: makeBuffer(device, srcData, "source", Uint32Array),
        emitBlockSums: true,
        workgroupLength: 8,
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
    const device = await labeledGpuDevice();

    const srcData = [0, 1, 2, 3, 4, 5, 6, 7];
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: true,
      workgroupLength: 4,
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
    const device = await labeledGpuDevice();

    const srcData = [0, 1, 2, 3, 4, 5, 6];
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: true,
      workgroupLength: 8,
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
    const device = await labeledGpuDevice();

    const srcData = [0, 1, 2, 3, 4, 5, 6];
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: true,
      workgroupLength: 4,
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
    const device = await labeledGpuDevice();
    const srcData = [1, 2, 3];
    const initialValue = 9;
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: false,
      workgroupLength: 4,
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
    const device = await labeledGpuDevice();
    const srcData = [1, 2, 3, 4, 5, 6, 7];
    const initialValue = 9;
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: false,
      workgroupLength: 8,
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
