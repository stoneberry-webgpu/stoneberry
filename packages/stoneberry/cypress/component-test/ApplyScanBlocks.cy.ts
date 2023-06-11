import {
  ShaderGroup,
  copyBuffer,
  labeledGpuDevice,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withLeakTrack,
} from "thimbleberry";
import { ApplyScanBlocks } from "../../src/scan/ApplyScanBlocks.js";
import { makeBuffer } from "./util/MakeBuffer.js";
import { exclusiveSum, inclusiveSum } from "./util/PrefixSum.js";

it("apply scan blocks to partial prefix scan", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const origSrc = [0, 1, 2, 3, 4, 5, 6, 7];
    const prefixesSrc = [0, 1, 3, 6, 4, 9, 15, 22];
    const partialScan = makeBuffer(device, prefixesSrc, "prefixes", Uint32Array);

    const blockSumsSrc = [6, 28];
    const blockSums = makeBuffer(device, blockSumsSrc, "blockSums", Uint32Array);

    await withLeakTrack(async () => {
      const applyBlocks = new ApplyScanBlocks({
        device,
        partialScan,
        blockSums,
        workgroupLength: 4,
      });
      trackUse(applyBlocks);
      const shaderGroup = new ShaderGroup(device, applyBlocks);
      shaderGroup.dispatch();

      const expected = inclusiveSum(origSrc);
      const result = await copyBuffer(device, applyBlocks.result);
      expect(result).to.deep.equal(expected);
      trackRelease(applyBlocks);
    });
  });
});

it("largeExclusive", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const origSrc = [0, 1, 2, 3, 4, 5, 6, 7];
    const prefixesSrc = [0, 1, 3, 6, 4, 9, 15, 22];
    const partialScan = makeBuffer(device, prefixesSrc, "prefixes", Uint32Array);

    const blockSumsSrc = [6, 28];
    const blockSums = makeBuffer(device, blockSumsSrc, "blockSums", Uint32Array);
    const initialValue = 99;
    const expected = exclusiveSum(origSrc, initialValue);

    await withLeakTrack(async () => {
      const applyBlocks = new ApplyScanBlocks({
        device,
        partialScan,
        blockSums,
        workgroupLength: 4,
        exclusiveLarge: true,
        initialValue,
      });
      trackUse(applyBlocks);
      const shaderGroup = new ShaderGroup(device, applyBlocks);
      shaderGroup.dispatch();

      const result = await copyBuffer(device, applyBlocks.result);
      expect(result).to.deep.equal(expected);
      trackRelease(applyBlocks);
    });
  });
});