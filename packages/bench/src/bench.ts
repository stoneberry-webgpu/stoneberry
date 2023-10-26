import { Vec2, initGpuTiming } from "thimbleberry";
import { benchDevice } from "./benchDevice.js";
import { logCsvReport } from "./benchReport.js";
import { prefixScanBench } from "./prefixScanBench.js";
import { reduceBufferBench } from "./reduceBufferBench.js";
import { reduceTextureBench } from "./reduceTextureBench.js";
import { histogramTextureBench } from "./histogramTextureBench.js";
import { gitVersion } from "../version/gitVersion.js";
import { BenchResult } from "./benchShader.js";

main();

async function main(): Promise<void> {
  const testUtc = Date.now().toString();
  const device = await benchDevice();

  initGpuTiming(device);
  // await benchScan(device, testUtc);
  // await benchReduceBuffer(device, testUtc);
  // await benchReduceTexture(device, testUtc);
  await benchHistogramTexture(device, testUtc);
}

async function benchScan(device: GPUDevice, time: string): Promise<void> {
  const size = 2 ** 27;
  // const { averageClockTime, fastest } = await prefixScanBench(device, size, 100);

  // logCsvReport([fastest], averageClockTime, size, "scan:", time, false);
}

async function benchReduceBuffer(device: GPUDevice, time: string): Promise<void> {
  const size = 2 ** 27;
  // const { averageClockTime, fastest } = await reduceBufferBench(device, size, 700);

  // logCsvReport([fastest], averageClockTime, size, "reduceBuf:", time, false);
}

async function benchReduceTexture(device: GPUDevice, time: string): Promise<void> {
  const size = [2 ** 13, 2 ** 13] as Vec2;
  const linearSize = size[0] * size[1];
  // const { averageClockTime, fastest } = await reduceTextureBench(device, size, 400);

  // logCsvReport([fastest], averageClockTime, linearSize, "reduceTex:", time, false);
}

async function benchHistogramTexture(device: GPUDevice, utc: string): Promise<void> {
  const size = [2 ** 8, 2 ** 8] as Vec2;
  const benchResult = await histogramTextureBench(device, size, 3);

  logCsv("histogramTexture", benchResult, size[0] * size[1], utc);
}

function logCsv(
  label: string,
  benchResult: BenchResult,
  srcElems: number,
  utc: string
): void {
  logCsvReport({
    benchResult,
    srcSize: srcElems * 4,
    label,
    reportType: "details",
    tags: { git: gitVersion, utc },
  });
}
