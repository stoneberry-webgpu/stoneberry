import {
  WorkgroupLimits,
  limitWorkgroupSize,
  maxWorkgroupSize,
} from "../../src/util/LimitWorkgroupSize.js";

it("maxWorkgroupSize limited", () => {
  const limits: WorkgroupLimits = {
    maxComputeWorkgroupSizeX: 256,
    maxComputeWorkgroupSizeY: 256,
    maxComputeInvocationsPerWorkgroup: 256,
  };
  const result = maxWorkgroupSize(limits);
  expect(result).deep.eq([16, 16]);
});

it("limitWorkgroupSize unlimited", () => {
  const limits: WorkgroupLimits = {
    maxComputeWorkgroupSizeX: 256,
    maxComputeWorkgroupSizeY: 256,
    maxComputeInvocationsPerWorkgroup: 256,
  };
  const result = limitWorkgroupSize(limits, [8, 8]);
  expect(result).deep.eq([8, 8]);
});

it("limitWorkgroupSize limit preserves ratio", () => {
  const limits: WorkgroupLimits = {
    maxComputeWorkgroupSizeX: 256,
    maxComputeWorkgroupSizeY: 256,
    maxComputeInvocationsPerWorkgroup: 256,
  };
  const result = limitWorkgroupSize(limits, [256, 16]);
  expect(result).deep.eq([64, 4]);
});
