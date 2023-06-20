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

/** run the shader multiple times and report the fastest iteration */
export async function benchShader(
  device: GPUDevice,
  nTimes: number,
  ...shaders: ComposableShader[]
): Promise<BenchResult> {
  const frameSpans: CompletedSpan[] = [];
  const clockTimes: number[] = [];
  const shaderGroup = new ShaderGroup(device, ...shaders);

  /** 1 warmup run */
  shaderGroup.dispatch();
  await device.queue.onSubmittedWorkDone();

  const start = performance.now();

  /** render nTimes */
  for (let i = 0; i < nTimes; i++) {
    const frameLabel = `frame-${i}`;
    performance.mark(frameLabel);
    const frameStart = performance.now();
    const { span } = withTimestampGroup(frameLabel, () => {
      shaderGroup.dispatch();
    });
    if (span) {
      frameSpans.push(span);
      clockTimes.push(performance.now() - frameStart);
    } else {
      console.error("no span from withTimestampGroup. gpuTiming not initialized?");
    }
  }
  await device.queue.onSubmittedWorkDone();

  const clockTime = performance.now() - start;
  const averageClockTime = clockTime / nTimes;

  const { reports, fastest } = await collateGpuResults(frameSpans);
  return { reports, fastest, averageClockTime};
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
