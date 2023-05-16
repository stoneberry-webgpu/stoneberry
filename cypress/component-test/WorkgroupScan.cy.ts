import {
  ShaderGroup,
  labeledGpuDevice,
  printBuffer,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withBufferCopy,
  withLeakTrack,
} from "thimbleberry";
import { WorkgroupScan } from "../../src/scan/WorkgroupScan.js";
import { makeBuffer } from "./util/MakeBuffer.js";
import { exclusiveSum, inclusiveSum } from "./util/PrefixSum.js";
import { dlog } from "berry-pretty";

it("workgroup scan one evenly sized buffer", async () => {
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

      await withBufferCopy(device, scan.prefixScan, "u32", data => {
        expect([...data]).to.deep.equal([0, 1, 3, 6, 10, 15, 21, 28]);
      });
      await withBufferCopy(device, scan.blockSums, "u32", data => {
        expect([...data]).to.deep.equal([28]);
      });
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

    await withBufferCopy(device, scan.blockSums, "u32", data => {
      expect([...data]).to.deep.equal([6, 22]);
    });
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

    await withBufferCopy(device, scan.prefixScan, "u32", data => {
      expect([...data]).to.deep.equal([0, 1, 3, 6, 10, 15, 21]);
    });
    await withBufferCopy(device, scan.blockSums, "u32", data => {
      expect([...data]).to.deep.equal([21]);
    });
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

    await withBufferCopy(device, scan.prefixScan, "u32", data => {
      expect([...data]).to.deep.equal([0, 1, 3, 6, 4, 9, 15]); // prefix sums within each workgroup block
    });
    await withBufferCopy(device, scan.blockSums, "u32", data => {
      expect([...data]).to.deep.equal([6, 15]);
    });
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
      emitBlockSums: false, // TODO test this too
      workgroupLength: 4,
      exclusive: true,
      initialValue,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();
    const expected = exclusiveSum(srcData, initialValue);

    await withBufferCopy(device, scan.prefixScan, "u32", data => {
      expect([...data]).to.deep.equal(expected);
    });
  });
});

it.only("workgroup exlusive scan, two workgroups", async () => {
  console.clear();
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    const srcData = [1, 2, 3, 4, 5];
    const initialValue = 9;
    const scan = new WorkgroupScan({
      device,
      source: makeBuffer(device, srcData, "source", Uint32Array),
      emitBlockSums: false, // TODO test this too
      workgroupLength: 4,
      exclusive: true,
      initialValue,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();
    const expected1 = exclusiveSum(srcData.slice(0, 4), initialValue);
    const expected2 = inclusiveSum(srcData.slice(3, -1));
    const expected = [...expected1, ...expected2];
    dlog({ srcData });
    dlog({ expected1, expected2});

    await printBuffer(device, scan.prefixScan, "u32");
    await printBuffer(device, scan.debugBuffer, "f32");

    await withBufferCopy(device, scan.prefixScan, "u32", data => {
      expect([...data]).to.deep.equal(expected);
    });
  });
});

// TODO test with middle layers in workgroup used.
