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
import { Scanner } from "../../src/scan/Scanner.js";
import { makeBuffer } from "./util/MakeBuffer.js";
import { prefixSum } from "./util/PrefixSum.js";

it("scan sequence: unevenly sized buffer, two workgroups, one level block scanning", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = [0, 1, 2, 3, 4, 5, 6];

    const scan = new Scanner({
      device,
      src: makeBuffer(device, srcData, "source", Uint32Array),
      template: sumU32,
      workgroupLength: 4,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();

    await withBufferCopy(device, scan.sourceScan.blockSums, "u32", data => {
      expect([...data]).deep.equals([6, 15]);
    });
    await withBufferCopy(device, scan.blockScans[0].prefixScan, "u32", data => {
      expect([...data]).deep.equals([6, 21]);
    });
    const expected = prefixSum(srcData);
    await withBufferCopy(device, scan.result, "u32", data => {
      expect([...data]).deep.equals(expected);
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

    const scan = new Scanner({
      device,
      src: makeBuffer(device, srcData, "source", Uint32Array),
      template: sumU32,
      workgroupLength: 4,
    });
    const shaderGroup = new ShaderGroup(device, scan);
    shaderGroup.dispatch();

    const expected = prefixSum(srcData);
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
      const scan = new Scanner({
        device,
        src: makeBuffer(device, srcData, "source", Uint32Array),
        template: sumU32,
        workgroupLength: 4,
      });
      trackUse(scan);
      const shaderGroup = new ShaderGroup(device, scan);
      shaderGroup.dispatch();

      const expected = prefixSum(srcData);
      await withBufferCopy(device, scan.result, "u32", data => {
        expect([...data]).deep.equals(expected);
      });
      trackRelease(scan);
    });
  });
});
