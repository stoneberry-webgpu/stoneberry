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
  const { averageClockTime, fastest } = await prefixScanBench(device);

  logCsvReport([fastest], averageClockTime, "scan:", testUtc);
}

/** log a csv formatted version of the report to a localhost websocket, and the debug console */
function logCsvReport(
  reports: GpuPerfReport[],
  averageTime: number,
  label: string,
  utc = Date.now().toString()
): void {
  const averageTimeMs = averageTime.toFixed(2);
  const averageKey = `${label} average clock`
  const reportTexts = reports.map(report =>
    csvReport(
      report,
      { [averageKey]: averageTimeMs },
      { utc, git: gitVersion },
      `${label} gpu time`
    )
  );

  const msg = reportTexts.join("");
  console.log(msg);
  logWebSocket(msg);
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
