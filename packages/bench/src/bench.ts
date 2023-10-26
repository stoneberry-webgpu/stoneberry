import { Vec2, initGpuTiming } from "thimbleberry";
import { benchDevice } from "./benchDevice.js";
import { BenchReportType, logCsvReport } from "./benchReport.js";
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
  await benchScan(device, testUtc);
  await benchReduceBuffer(device, testUtc);
  await benchReduceTexture(device, testUtc);
  await benchHistogramTexture(device, testUtc);
}

async function benchScan(device: GPUDevice, time: string): Promise<void> {
  const size = 2 ** 27;
  const benchResult = await prefixScanBench(device, size, 100);
  logCsv("scan", benchResult, size, time);
}

async function benchReduceBuffer(device: GPUDevice, time: string): Promise<void> {
  const size = 2 ** 27;
  const benchResult = await reduceBufferBench(device, size, 700);
  logCsv("reduceBuffer", benchResult, size, time);
}

async function benchReduceTexture(device: GPUDevice, time: string): Promise<void> {
  const size = [2 ** 13, 2 ** 13] as Vec2;
  const benchResult = await reduceTextureBench(device, size, 400);
  logCsv("reduceTexture", benchResult, size[0] * size[1], time);
}

async function benchHistogramTexture(device: GPUDevice, utc: string): Promise<void> {
  const size = [2 ** 13, 2 ** 13] as Vec2;
  const benchResult = await histogramTextureBench(device, size, 400);
  logCsv("histogramTexture", benchResult, size[0] * size[1], utc);
}

function logCsv(
  label: string,
  benchResult: BenchResult,
  srcElems: number,
  utc: string,
  reportType: BenchReportType = "fastest"
): void {
  const preTags = { benchmark: label };
  const tags = { gitVersion, utc };
  const srcSize = srcElems * 4;
  logCsvReport({ benchResult, srcSize, reportType, preTags, tags, precision: 2 });
}
