import { gitVersion } from "../version/gitVersion.js";
import { csvReport, FormattedCsv, GpuPerfReport, initGpuTiming } from "thimbleberry";
import { prefixScanBench } from "./prefixScanBench.js";
import { benchDevice } from "./benchDevice.js";

main();

async function main(): Promise<void> {
  const testUtc = Date.now().toString();
  const device = await benchDevice("scan:");

  initGpuTiming(device);
  const size = 2 ** 27;
  const { averageClockTime, fastest } = await prefixScanBench(device, size);

  logCsvReport([fastest], averageClockTime, size, "scan:", testUtc);
}


/** log a csv formatted version of the report to a localhost websocket, and the debug console */
function logCsvReport(
  reports: GpuPerfReport[],
  averageTime: number,
  srcSize: number,
  label: string,
  utc = Date.now().toString()
): void {
  const averageTimeMs = averageTime.toFixed(2);
  const seconds = averageTime / 1000;
  const bytesPerElement = 4;
  const gigabytes = (srcSize * bytesPerElement) / 2 ** 30;
  const gbSec = (gigabytes / seconds).toFixed(2);
  const reportTexts = reports.map(report =>
    csvReport(
      report,
      { [`${label} average clock`]: averageTimeMs },
      { utc, git: gitVersion },
      `${label} gpu time`
    )
  );

  const summaryText = summaryReport([[`${label} gigabytes/sec`, gbSec]], utc, gitVersion);

  const allReports = reportTexts.join("");
  const msg = allReports + "\n\n" + summaryText;
  console.log(msg);
  logWebSocket(msg);
}

function summaryReport(values: [string, string][], utc: string, git: string): string {
  const fields = { name: 20, value: 13, utc: 20, git: 10 };
  const summaryCsv = new FormattedCsv(fields);
  const records = values.map(([name, value]) => ({ name, value, utc, git }));
  return summaryCsv.report(records);
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
