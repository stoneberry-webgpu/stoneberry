import { Vec2, initGpuTiming } from "thimbleberry";
import { benchDevice } from "./benchDevice.js";
import { logCsvReport } from "./benchReport.js";
import { prefixScanBench } from "./prefixScanBench.js";
import { reduceBufferBench } from "./reduceBufferBench.js";
import { reduceTextureBench } from "./reduceTextureBench.js";

main();

async function main(): Promise<void> {
  const testUtc = Date.now().toString();
  const device = await benchDevice();

  initGpuTiming(device);
  await benchScan(device, testUtc);
  await benchReduceBuffer(device, testUtc);
  await benchReduceTexture(device, testUtc);
}

async function benchScan(device: GPUDevice, time: string): Promise<void> {
  const size = 2 ** 27;
  const { averageClockTime, fastest } = await prefixScanBench(device, size, 50);

  logCsvReport([fastest], averageClockTime, size, "scan:", time);
}

async function benchReduceBuffer(device: GPUDevice, time: string): Promise<void> {
  const size = 2 ** 27;
  const { averageClockTime, fastest } = await reduceBufferBench(device, size, 50);

  logCsvReport([fastest], averageClockTime, size, "reduceBuf:", time);
}

async function benchReduceTexture(device: GPUDevice, time: string): Promise<void> {
  const size = [2 ** 13, 2 ** 13] as Vec2;
  const linearSize = size[0] * size[1];
  const { averageClockTime, fastest } = await reduceTextureBench(device, size, 50);

  logCsvReport([fastest], averageClockTime, linearSize, "reduceTex:", time);
}
