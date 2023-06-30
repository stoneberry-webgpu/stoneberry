import { gitVersion } from "../version/gitVersion.js";
import { csvReport, FormattedCsv, GpuPerfReport, initGpuTiming } from "thimbleberry";
import { prefixScanBench } from "./prefixScanBench.js";
import { benchDevice } from "./benchDevice.js";
import { logCsvReport } from "./benchReport.js";

main();

async function main(): Promise<void> {
  const testUtc = Date.now().toString();
  const device = await benchDevice("scan:");

  initGpuTiming(device);
  const size = 2 ** 27;
  const { averageClockTime, fastest } = await prefixScanBench(device, size, 50);

  logCsvReport([fastest], averageClockTime, size, "scan:", testUtc);
}
