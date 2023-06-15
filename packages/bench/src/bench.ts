import { gitVersion } from "../version/gitVersion.js";
import { csvReport, GpuPerfReport, initGpuTiming, labeledGpuDevice } from "thimbleberry";
import { prefixScanBench } from "./prefixScanBench.js";

main();

async function main(): Promise<void> {
  const testUtc = Date.now().toString();
  const device = await labeledGpuDevice({
    requiredFeatures: ["timestamp-query"],
  });

  initGpuTiming(device);
  const { fastest, clockTime } = await prefixScanBench(device);

  logCsvReport(fastest, clockTime, testUtc);
}

/** log a csv formatted version of the report to a localhost websocket, and the debug console */
function logCsvReport(
  report: GpuPerfReport,
  clockTime: number,
  utc = Date.now().toString()
): void {
  const clockTimeMs = clockTime.toFixed(2);
  const reportText = csvReport(
    report,
    { "clock time": clockTimeMs },
    { utc, git: gitVersion },
    "scan total gpu"
  );
  console.log(reportText);
  logWebSocket(reportText);
}

function logWebSocket(message: string): void {
  const params = new URLSearchParams(document.URL);
  const port = params.get("reportPort");
  if (port) {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.onopen = () => {
      ws.send(message);
      ws.close();
    };
  }
}
