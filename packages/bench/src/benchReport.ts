import { reportJson, FormattedCsv, GpuPerfReport, reportDuration } from "thimbleberry";
import { BenchResult } from "./benchShader.js";

/** "summary-only" shows only a gb/sec table
 * "fastest" shows a table with perf details from the fastest run, and also the summary
 * "details" shows a table with perf details from all runs, and also the summary
 */
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

/** log a csv formatted version of the benchmark performance records 
 * to the debug console and to a localhost websocket */
export function logCsvReport(params: LogCsvConfig): void {
  const gpuReports = selectGpuCsv(params);
  const summaryText = summaryCsv(params);
  const sections = [...gpuReports, summaryText];
  const msg = sections.join("\n\n") + "\n\n";
  console.log(msg);
  logWebSocket(msg);
}

/** return the gpu perf csv requested by reportType,
 * (or none for "summary-only") */
function selectGpuCsv(params: LogCsvConfig): string[] {
  const { benchResult, reportType = "fastest", label = "", tags } = params;
  const { averageClockTime, reports } = benchResult;

  let toReport: GpuPerfReport[] = [];
  if (reportType === "summary-only") {
    return [];
  } else if (reportType === "details") {
    toReport = reports;
  } else if (reportType === "fastest") {
    const fastest = reports.reduce((a, b) =>
      reportDuration(a) < reportDuration(b) ? a : b
    );
    toReport = [fastest];
  }

  const reportCsv = gpuPerfCsv(toReport, label, averageClockTime, { ...tags });
  return [reportCsv];
}

/** return a csv table from gpu performance records */
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

/** create a summary csv table showing gb/sec */
function summaryCsv(params: LogCsvConfig): string {
  const { benchResult, srcSize, label = "", tags } = params;
  const { averageClockTime } = benchResult;

  const seconds = averageClockTime / 1000;
  const gigabytes = srcSize / 2 ** 30;
  const gbSec = (gigabytes / seconds).toFixed(2);

  const name = `${label} gb/sec`;

  const summaryCsv = new FormattedCsv();
  return summaryCsv.report([{ name, speed: gbSec, ...tags }]);
}

/** If reporting is enabled via the ?reportUrl url param,
 *  write a message to a websocket on that port */
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
