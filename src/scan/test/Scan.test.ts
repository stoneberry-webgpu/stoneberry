import { labeledGpuDevice } from "thimbleberry";
import {expect, it} from "vitest";
// import { makeBuffer } from "./MakeBuffer";
// import { prefixSum } from "./PrefixSum";

it("sum scan, two workgroups", async () => {
  // const device = await labeledGpuDevice();
  const srcData = [0, 1, 2, 3, 4, 5, 6];
  console.log("got here");

  // const scan = new ScanSequence({
  //   device,
  //   source: makeBuffer(device, srcData, "source", Uint32Array),
  //   reduceTemplate: sumTemplateUnsigned,
  //   workgroupLength: 4,
  // });
  // const shaderGroup = new ShaderGroup(device, scan);
  // shaderGroup.dispatch();

  // await withBufferCopy(device, scan.sourceScan.blockSums, "u32", (data) => {
  //   expect([...data]).deep.equals([6, 15]);
  // });
  // await withBufferCopy(device, scan.blockScans[0].prefixScan, "u32", (data) => {
  //   expect([...data]).deep.equals([6, 21]);
  // });
  // const expected = prefixSum(srcData);
  // await withBufferCopy(device, scan.prefixScan, "u32", (data) => {
  //   expect([...data]).deep.equals(expected);
  // });

})

