import { gitVersion } from "../version/gitVersion.js";
import { csvReport, GpuPerfReport, initGpuTiming, labeledGpuDevice } from "thimbleberry";
import { prefixScanBench } from "./prefixScanBench.js";

const reportPort = 9292;

main();

async function main(): Promise<void> {
  const testUtc = Date.now().toString();
  const device = await labeledGpuDevice({
    requiredFeatures: ["timestamp-query"],
  });

  initGpuTiming(device);
  const { fastest, clockTime } = await prefixScanBench(device);

  logCsvWs(fastest, clockTime, testUtc, reportPort);
}

/** log a csv formatted version of the report to a localhost websocket, and the debug console */
export function logCsvWs(
  report: GpuPerfReport,
  clockTime: number,
  utc = Date.now().toString(),
  port = reportPort
): void {
  const clockTimeMs = clockTime.toFixed(2);
  const reportText = csvReport(
    report,
    { "clock time": clockTimeMs },
    { utc, git: gitVersion },
    "scan total gpu"
  );
  console.log(reportText);
  const ws = new WebSocket(`ws://localhost:${port}`);
  ws.onopen = () => {
    ws.send(reportText);
    ws.close();
  };
}
