import {
  CompletedSpan,
  ComposableShader,
  GpuPerfReport,
  ShaderGroup,
  filterReport,
  gpuTiming,
  withTimestampGroup,
} from "thimbleberry";

// TODO mv this file to thimbleberry

/** timing results */
export interface BenchResult {
  reports: GpuPerfWithId[];
  averageClockTime: number;
}

export interface GpuPerfWithId extends GpuPerfReport {
  id: string;
}

export interface BenchConfig {
  device: GPUDevice;
  runs: number;
  runsPerBatch?: number;
  warmup?: boolean;
}

/** run the shader multiple times and report the iteration */
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
    return spans.map((span, i) => {
      const filtered = filterReport(report, span);
      return { ...filtered, id: i.toString() };
    });
  });

  return { reports, averageClockTime };
}

interface BatchResult {
  averageClockTime: number;
  spans: CompletedSpan[];
  report: GpuPerfReport;
  batchSize: number;
}

async function runBatch(
  device: GPUDevice,
  run: number,
  batchSize: number,
  shaderGroup: ShaderGroup
): Promise<BatchResult> {
  const spans: CompletedSpan[] = [];
  gpuTiming!.restart();

  /* run the shader multiple times */
  const batchStart = performance.now();
  for (let i = run, batchNum = 0; batchNum < batchSize; i++, batchNum++) {
    const span = runOnce(i, shaderGroup);
    span && spans.push(span);
  }

  await device.queue.onSubmittedWorkDone();
  const clockTime = performance.now() - batchStart;
  const report = await gpuTiming!.results();
  const averageClockTime = clockTime / batchSize;
  return { averageClockTime, spans, report, batchSize };
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
