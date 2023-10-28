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

export interface MakeBenchableShader extends Partial<ControlParams> {
  makeShader: MakeShader;
}

export interface ControlParams {
  runs: number;
  reportType: BenchReportType;
  precision: number;
  warmup: number;
  runsPerBatch: number;
}

const defaultControl: ControlParams = {
  reportType: "median",
  runs: 100,
  precision: 2,
  warmup: 15,
  runsPerBatch: 50,
};

interface NamedBenchResult {
  name: string;
  benchResult: BenchResult;
  srcSize: number;
}

/** run one or more benchmarks and report the results.
 * Control parameters for the benchmarks (e.g. # of runs, type of reports),
 * may be specified statically as parameters to benchRunner().
 * Url query parameters are also supported (e.g. ?runs=1000&reportType=details),
 * and will override static parameters.
 *
 */
export async function benchRunner(makeBenchables: MakeBenchableShader[]): Promise<void> {
  const testUtc = Date.now().toString();
  const device = await benchDevice();
  initGpuTiming(device);

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
    const { srcSize, shader } = b;
    const { reportType, runs, precision, warmup, runsPerBatch } = controlParams(b);
    const name = shader.name || shader.constructor.name || "<shader>";
    const benchResult = await benchShader({ device, runs, warmup, runsPerBatch }, shader);
    namedResults.push({ benchResult, name, srcSize });
    if (reportType !== "summary-only") {
      logCsv(name, benchResult, srcSize, testUtc, reportType, precision);
    }
  }

  const { reportType, precision } = controlParams();
  if (reportType === "details") {
    namedResults.forEach(r => {
      logCsv(r.name, r.benchResult, r.srcSize, testUtc, "summary-only", precision);
    });
  }
}

function controlParams(provided?: Partial<ControlParams>): ControlParams {
  const urlParams = urlControlParams();
  const result = { ...defaultControl, ...provided, ...urlParams };

  return result;
}

function urlControlParams(): Partial<ControlParams> {
  const params = new URLSearchParams(window.location.search);

  return removeUndefined({
    runs: intParam(params, "runs"),
    reportType: stringParam(params, "reportType"),
    warmup: intParam(params, "warmup"),
    runsPerBatch: intParam(params, "runsPerBatch"),
    precision: intParam(params, "precision"),
  });
}

function intParam(params: URLSearchParams, name: string): number | undefined {
  const value = params.get(name);
  return value ? parseInt(value) : undefined;
}

function stringParam<T = string>(params: URLSearchParams, name: string): T | undefined {
  return (params.get(name) as T) || undefined;
}

function logCsv(
  label: string,
  benchResult: BenchResult,
  srcSize: number,
  utc: string,
  reportType: BenchReportType,
  precision: number
): void {
  const preTags = { benchmark: label };
  const tags = { gitVersion, utc };
  logCsvReport({ benchResult, srcSize, reportType, preTags, tags, precision });
}

/** @return a copy, eliding fields with undefined values */
function removeUndefined<T>(obj: T): Partial<T> {
  const result = { ...obj };
  for (const key in result) {
    if (result[key] === undefined) {
      delete result[key];
    }
  }
  return result;
}
