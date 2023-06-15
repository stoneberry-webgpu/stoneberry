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
  fastest: GpuPerfReport;
  clockTime: number;
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

  /** render nTimes */
  for (let i = 0; i < nTimes; i++) {
    const frameLabel = `frame-${i}`;
    performance.mark(frameLabel);
    const frameStart = performance.now();
    const { span } = withTimestampGroup(frameLabel, () => {
      shaderGroup.dispatch();
    });
    await device.queue.onSubmittedWorkDone();
    if (span) {
      frameSpans.push(span);
      clockTimes.push(performance.now() - frameStart);
    } else {
      console.error("no span from withTimestampGroup. gpuTiming not initialized?");
    }
  }

  const { fastest, fastestIndex } = await fastestGpuResult(frameSpans);
  const clockTime = clockTimes[fastestIndex];
  return { fastest, clockTime };
}

interface GpuReports {
  fastest: GpuPerfReport;
  fastestIndex: number;
  frameReports: GpuPerfReport[];
}

/** collect gpu timing results and return the fastest frame */
async function fastestGpuResult(frameSpans: CompletedSpan[]): Promise<GpuReports> {
  const report = await gpuTiming!.results();
  const frameReports = frameSpans.map(span => filterReport(report, span));
  const fastest = frameReports.reduce((a, b) =>
    reportDuration(a) < reportDuration(b) ? a : b
  );
  const fastestIndex = frameReports.findIndex(r => r === fastest);
  return { frameReports, fastest, fastestIndex };
}
