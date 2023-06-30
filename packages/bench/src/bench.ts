import { initGpuTiming } from "thimbleberry";
import { benchDevice } from "./benchDevice.js";
import { logCsvReport } from "./benchReport.js";
import { prefixScanBench } from "./prefixScanBench.js";
import { reduceBufferBench } from "./reduceBufferBench.js";

main();

async function main(): Promise<void> {
  const testUtc = Date.now().toString();
  const device = await benchDevice();

  initGpuTiming(device);
  await benchScan(device, testUtc);
  await reduceScan(device, testUtc);
}

async function benchScan(device: GPUDevice, time:string):Promise<void> {
  const size = 2 ** 27;
  const { averageClockTime, fastest } = await prefixScanBench(device, size, 50);

  logCsvReport([fastest], averageClockTime, size, "scan:", time);
}

async function reduceScan(device: GPUDevice, time:string):Promise<void> {
  const size = 2 ** 27;
  const { averageClockTime, fastest } = await reduceBufferBench(device, size, 50);

  logCsvReport([fastest], averageClockTime, size, "reduce:", time);
}
