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

const details = true

const benches = [benchScan, benchReduceBuffer, benchReduceTexture, benchHistogramTexture];
async function main(): Promise<void> {
  const testUtc = Date.now().toString();
  const device = await benchDevice();

  initGpuTiming(device);

  const benchResults: NamedBenchResult[] = [];
  for (const bench of benches) {
    const r = await bench(device);
    logCsv(r.name, r.benchResult, r.elems, testUtc, details ? "details" : undefined);
    benchResults.push(r);
  }
  if (details) {
    benchResults.forEach(r => {
      logCsv(r.name, r.benchResult, r.elems, testUtc, "summary-only");
    });
  }
}

interface NamedBenchResult {
  name: string;
  benchResult: BenchResult;
  elems: number;
}

async function benchScan(device: GPUDevice): Promise<NamedBenchResult> {
  const size = 2 ** 27;
  const benchResult = await prefixScanBench(device, size, 100);
  return { name: "scan", benchResult, elems: size };
}

async function benchReduceBuffer(device: GPUDevice): Promise<NamedBenchResult> {
  const size = 2 ** 27;
  const benchResult = await reduceBufferBench(device, size, 100);
  return { name: "reduceBuffer", benchResult, elems: size };
}

async function benchReduceTexture(device: GPUDevice): Promise<NamedBenchResult> {
  const size = [2 ** 13, 2 ** 13] as Vec2;
  const benchResult = await reduceTextureBench(device, size, 100);
  return { name: "reduceTexture", benchResult, elems: size[0] * size[1] };
}

async function benchHistogramTexture(device: GPUDevice): Promise<NamedBenchResult> {
  const size = [2 ** 13, 2 ** 13] as Vec2;
  const benchResult = await histogramTextureBench(device, size, 100);
  return { name: "histogramTexture", benchResult, elems: size[0] * size[1] };
}

function logCsv(
  label: string,
  benchResult: BenchResult,
  srcElems: number,
  utc: string,
  reportType: BenchReportType = "median"
): void {
  const preTags = { benchmark: label };
  const tags = { gitVersion, utc };
  const srcSize = srcElems * 4;
  logCsvReport({ benchResult, srcSize, reportType, preTags, tags, precision: 4 });
}
