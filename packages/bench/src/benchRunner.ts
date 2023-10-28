import { ComposableShader, initGpuTiming } from "thimbleberry";
import { gitVersion } from "../version/gitVersion.js";
import { benchDevice } from "./benchDevice.js";
import { BenchReportType, logCsvReport } from "./benchReport.js";
import { BenchResult, benchShader } from "./benchShader.js";

export interface ShaderAndSize {
  shader: ComposableShader;
  srcSize: number;
}

/** Create function to make a shader for benchmarking */
export type MakeShader = (
  device: GPUDevice,
  ...params: any[]
) => Promise<ShaderAndSize> | ShaderAndSize;

export interface MakeBenchableShader {
  makeShader: MakeShader;
  runs?: number;
}

interface NamedBenchResult {
  name: string;
  benchResult: BenchResult;
  srcSize: number;
}

/** run one or more benchmarks and report the results */
export async function benchRunner(makeBenchables: MakeBenchableShader[]): Promise<void> {
  const testUtc = Date.now().toString();
  const device = await benchDevice();
  initGpuTiming(device);
  const { reportType } = controlParams();

  const benchables = [];
  for (const make of makeBenchables) {
    const { shader, srcSize } = await make.makeShader(device);
    benchables.push({
      ...make,
      shader,
      srcSize,
    });
  }

  const namedResults: NamedBenchResult[] = [];
  for (const b of benchables) {
    const { runs = 50, srcSize } = b;
    const name = b.shader.name || b.shader.constructor.name || "<shader>";
    const benchResult = await benchShader({ device, runs }, b.shader);
    namedResults.push({ benchResult, name, srcSize });
    if (reportType !== "summary-only") {
      logCsv(name, benchResult, srcSize, testUtc, reportType);
    }
  }

  if (reportType === "details") {
    namedResults.forEach(r => {
      logCsv(r.name, r.benchResult, r.srcSize, testUtc, "summary-only");
    });
  }
}

interface ControlParams {
  reportType: BenchReportType;
}

function controlParams(): ControlParams {
  return { reportType: "details" };
}

function logCsv(
  label: string,
  benchResult: BenchResult,
  srcSize: number,
  utc: string,
  reportType: BenchReportType
): void {
  const preTags = { benchmark: label };
  const tags = { gitVersion, utc };
  logCsvReport({ benchResult, srcSize, reportType, preTags, tags, precision: 4 });
}
