import { ComposableShader, GpuPerfReport, ShaderGroup, filterReport } from "thimbleberry";
import { BatchResult, runBatch } from "./benchBatch.js";

// TODO mv this file to thimbleberry

/** parameters to benchShader() */
export interface BenchConfig {
  device: GPUDevice;
  runs: number;
  runsPerBatch?: number;
  warmup?: boolean;
}

/** timing results */
export interface BenchResult {
  reports: GpuPerfWithId[];
  averageClockTime: number;
}

export interface GpuPerfWithId extends GpuPerfReport {
  id: string;
}

/** run the shader multiple times, in batches, and report gpu and cpu clock timings */
export async function benchShader(
  config: BenchConfig,
  ...shaders: ComposableShader[]
): Promise<BenchResult> {
  const { device, runs, warmup = true, runsPerBatch = 50 } = config;
  const batchResults: BatchResult[] = [];
  const shaderGroup = new ShaderGroup(device, ...shaders);

  /* warmup run */
  if (warmup) {
    shaderGroup.dispatch();
    await device.queue.onSubmittedWorkDone();
  }

  /* run the shader in batches, so we don't overflow timing buffers */
  for (let i = 0; i < runs; ) {
    const runsThisBatch = Math.min(runsPerBatch, runs - i);
    const result = await runBatch(device, i, runsThisBatch, shaderGroup);
    batchResults.push(result);
    i += runsThisBatch;
  }

  // find average clock time across all batches
  const batchAverages = batchResults.map(r => r.averageClockTime * r.batchSize);
  const averageClockTime = batchAverages.reduce((a, b) => a + b) / runs;

  const reports = batchResults.flatMap(({ report, spans }) => {
    return spans.map(span => {
      const filtered = filterReport(report, span);
      return { ...filtered, id: span.runId.toString() };
    });
  });

  return { reports, averageClockTime };
}
