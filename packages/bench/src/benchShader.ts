import {
  CompletedSpan,
  ComposableShader,
  GpuPerfReport,
  ShaderGroup,
  filterReport,
  gpuTiming,
  reportDuration,
  withTimestampGroup,
} from "thimbleberry";

export interface BenchResult {
  reports: GpuPerfReport[];
  fastest: GpuPerfReport;
  averageClockTime: number;
}

export interface BenchConfig {
  device: GPUDevice;
  runs: number;
  runsPerBatch?: number;
  warmup?: boolean;
}

// TODO mv to thimbleberry

/** run the shader multiple times and report the fastest iteration */
export async function benchShader(
  config: BenchConfig,
  ...shaders: ComposableShader[]
): Promise<BenchResult> {
  const { device, runs, warmup = true, runsPerBatch = 10 } = config;
  const frameSpans: CompletedSpan[] = [];
  const batchAverages: number[] = [];
  const shaderGroup = new ShaderGroup(device, ...shaders);

  /* warmup run */
  if (warmup) {
    shaderGroup.dispatch();
    await device.queue.onSubmittedWorkDone();
  }

  /* run the shader multiple times */
  for (let i = 0; i < runs; ) {
    const runsThisBatch = Math.min(runsPerBatch, runs - i);
    const result = await runBatch(device, i, runsPerBatch, shaderGroup);
    const { averageClockTime, spans } = result;
    frameSpans.push(...spans);
    batchAverages.push(averageClockTime);
    i += runsThisBatch;
  }

  /* report results */
  const averageClockTime = batchAverages.reduce((a, b) => a + b) / batchAverages.length;
  const { reports, fastest } = await collateGpuResults(frameSpans);
  return { reports, fastest, averageClockTime };
}

interface BatchResult {
  averageClockTime: number;
  spans: CompletedSpan[];
}

async function runBatch(
  device: GPUDevice,
  run: number,
  batchSize: number,
  shaderGroup: ShaderGroup
): Promise<BatchResult> {
  const spans: CompletedSpan[] = [];
  /* run the shader multiple times */
  const batchStart = performance.now();
  for (let i = run, batchNum = 0; batchNum < batchSize; i++, batchNum++) {
    const span = runOnce(i, shaderGroup);
    span && spans.push(span);
  }

  await device.queue.onSubmittedWorkDone();
  const clockTime = performance.now() - batchStart;
  const averageClockTime = clockTime / batchSize;
  return { averageClockTime, spans };
}

function runOnce(id: number, shaderGroup: ShaderGroup): CompletedSpan | undefined {
  const frameLabel = `frame-${id}`;
  performance.mark(frameLabel);
  const { span } = withTimestampGroup(frameLabel, () => {
    shaderGroup.dispatch();
  });
  if (span) {
    return span;
  } else {
    console.error("no span from withTimestampGroup. gpuTiming not initialized?");
  }
}

interface GpuReports {
  fastest: GpuPerfReport;
  fastestIndex: number;
  reports: GpuPerfReport[];
}

/** collect gpu timing results and return the fastest frame */
async function collateGpuResults(frameSpans: CompletedSpan[]): Promise<GpuReports> {
  const report = await gpuTiming!.results();
  const reports = frameSpans.map(span => filterReport(report, span));
  const fastest = reports.reduce((a, b) =>
    reportDuration(a) < reportDuration(b) ? a : b
  );
  const fastestIndex = reports.findIndex(r => r === fastest);
  return { reports, fastest, fastestIndex };
}
