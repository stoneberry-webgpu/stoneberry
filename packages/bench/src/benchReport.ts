import { reportJson, FormattedCsv, GpuPerfReport, reportDuration } from "thimbleberry";
import { BenchResult } from "./benchShader.js";

export type ReportType = "summary-only" | "details" | "fastest";

export interface LogCsvConfig {
  /** perf results to log */
  benchResult: BenchResult;

  /** optional label prepended to summary rows */
  label?: string;

  /** number of 32 bit words in the source, for gb/sec calculation */
  srcSize: number;

  /** amount of detail to include in the report
   * @defaultValue "fastest" */
  reportType?: ReportType;

  /** additional columns to add to the report (e.g. git tag) */
  tags?: Record<string, string>;

}

/** log a csv formatted version of the report to a localhost websocket, and the debug console */
export function logCsvReport(params: LogCsvConfig): void {
  const { benchResult, srcSize, reportType = "fastest", label = "", tags } = params;
  const { averageClockTime, reports } = benchResult;

  let toReport: GpuPerfReport[] = [];
  if (reportType === "details") {
    toReport = reports;
  } else if (reportType === "fastest") {
    const fastest = reports.reduce((a, b) =>
      reportDuration(a) < reportDuration(b) ? a : b
    );
    toReport = [fastest];
  }

  const sections: string[] = [];
  if (reportType !== "summary-only") {
    const reportCsv = gpuPerfCsv(toReport, label, averageClockTime, { ...tags });
    sections.push(reportCsv);
  }

  const summaryText = summaryCsv(label, averageClockTime, srcSize, { ...tags });
  sections.push(summaryText);

  const msg = sections.join("\n\n") + "\n\n";

  console.log(msg);
  logWebSocket(msg);
}

function gpuPerfCsv(
  reports: GpuPerfReport[],
  label: string,
  averageTime: number,
  tags?: Record<string, string>,
  precision = 2
): string {
  const averageTimeMs = averageTime.toFixed(precision);
  const reportsRows = reports.map(report => {
    const jsonRows = reportJson(report, label);
    return jsonRows;
  });
  const flatRows = reportsRows.flat();
  flatRows.push({ name: `${label} avg clock`, duration: averageTimeMs });
  const reportFullRows = flatRows.map(row => ({ ...row, ...tags }));

  const fmt = new FormattedCsv();
  const csv = fmt.report(reportFullRows);
  return csv;
}

function summaryCsv(
  label: string,
  averageTime: number,
  srcSize: number,
  tags?: Record<string, string>
): string {
  const seconds = averageTime / 1000;
  const bytesPerElement = 4;
  const gigabytes = (srcSize * bytesPerElement) / 2 ** 30;
  const gbSec = (gigabytes / seconds).toFixed(2);

  const name = `${label} gb/sec`;

  const summaryCsv = new FormattedCsv();
  return summaryCsv.report([{ name, speed: gbSec, ...tags }]);
}

function logWebSocket(message: string): void {
  const url = new URL(document.URL);
  const params = new URLSearchParams(url.search);
  const port = params.get("reportPort");

  if (port) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.onopen = () => {
      ws.send(message);
      ws.close();
    };
  }
}
