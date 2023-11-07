import { exec } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { writeGitVersionTs } from "./extractGitVersion.js";
import fs from "fs/promises";
import { join } from "path";
import os from "os";

const execPromise = promisify(exec);

const benchWebPort = 3100;
const defaultCmd = "bench";
const benchResultsPort = 9292;

const taskMap = new Map<string, any>([
  ["version", version],
  ["dev", dev],
  ["bench", bench],
  ["bench:dev", benchDev],
  ["bench:details", benchDetails],
  ["bench:browser", benchBrowser],
  ["bench:dashcsv", benchDashCsv],
]);

export async function version(): Promise<string> {
  return writeGitVersionTs("version/gitVersion.ts");
}

export async function dev(): Promise<void> {
  await version();
  const server = await createViteServer();
  await server.listen(benchWebPort);
  await benchBrowser();
}

export async function bench(
  outfile = "benchmarks.csv",
  gitCheck = true,
  searchParams?: Record<string, any>
): Promise<void> {
  const rev = await version();
  const server = await createViteServer();
  await server.listen(benchWebPort);

  if (gitCheck && rev.endsWith("*")) {
    // uncommitted changes, don't save reports
    console.warn("uncommitted changes, not saving benchmarks");
    await benchBrowser();
  } else {
    // record benchmark results from the browser via websocket
    execEcho(`websocat -B 4194304 -s ${benchResultsPort} --no-line >> ${outfile}`);
    const params = { reportPort: benchResultsPort.toString(), ...searchParams };
    await benchBrowser(params);
  }
}

/** run the benchmarks out to temp file */
export async function benchDev(): Promise<void> {
  return bench("benchmarks-dev.csv", false);
}

/** run the benchmarks out to temp file, in details mode */
export async function benchDetails(): Promise<void> {
  await fs.rm("benchmarks-details.csv", { force: true });
  return bench("benchmarks-details.csv", false, {
    precision: "4",
    reportType: "details",
  });
}

export async function benchBrowser(searchParams?: Record<string, string>): Promise<void> {
  const query = searchParams ? "?" + new URLSearchParams(searchParams) : "";
  // TODO implement for windows
  const browserCmd =
    `open -a "Google Chrome Canary" 'http://localhost:${benchWebPort}/${query}' --args` +
    " --enable-dawn-features=allow_unsafe_apis" +
    " --enable-webgpu-developer-features" +
    " --disable-dawn-features=timestamp_quantization" +
    " --profile-directory=bench";
  console.log(browserCmd);
  await execEcho(browserCmd);
}

/** preprocess benchmark-details.csv files for import into tableau dashboard */
export async function benchDashCsv(): Promise<void> {
  const date = await execOut(`date '+%Y-%b-%d_%H-%M-%S'`);
  // splits the detailed output from the browser and produces:
  // two dated output files bench-summary-{date}.csv and bench-details-{date}.csv
  await execEcho(
    `awk -v date=${date} -f script/split-details.awk benchmarks-details.csv`
  );

  const details = `bench-details-${date}.csv`;
  const baseline = await baselineDetailsCsv();
  if (baseline) {
    const compare = `bench-compare-${date}.csv`;
    await compareCsv(details, baseline, compare);
  }
}

/** construct the compare .csv file */
async function compareCsv(
  details: string,
  baseline: string,
  compare: string
): Promise<void> {
  // trim column spaces from the baseline and details csv files
  const tempDir = await fs.mkdtemp(join(os.tmpdir(), "csv-"));
  const trimmedDetails = join(tempDir, "details.csv");
  const trimmedBase = join(tempDir, "base.csv");
  await trimCsv(details, trimmedDetails);
  await trimCsv(baseline, trimmedBase);

  // combine the files and remove blank lines
  const combinedCsv = join(tempDir, "combined.csv");
  const cpCmd = `cp ${trimmedDetails} ${combinedCsv}`;
  await execEcho(cpCmd);

  const concatCmd = `tail +2 ${trimmedBase} >> ${combinedCsv}`;
  await execEcho(concatCmd);

  const noBlanksCmd = `awk NF ${combinedCsv} > compare.csv`;
  await execEcho(noBlanksCmd);

  // sql script reads compare.csv and writes to compare-sorted.csv
  await execEcho(`sqlite3 < script/sort-runs.sql`);
  await fs.rm("compare.csv");
  await fs.rename("compare-sorted.csv", compare);

  await fs.rm(tempDir, { recursive: true });
}

/** verify that the baseline csv file exists */
async function baselineDetailsCsv(): Promise<string | null> {
  const baseline = "bench-baseline.csv";
  try {
    const path = await fs.realpath(baseline);
    const details = await fs.stat(path);
    if (details.isFile()) {
      return path;
    }
  } catch (e) { 
    // fall through
  }
  console.warn(`${baseline} not found`);
  return null;
}

/** rm spaces around columns */
async function trimCsv(srcFile: string, destFile: string): Promise<void> {
  const trimCmd = `awk -f script/trim-csv.awk ${srcFile} > ${destFile}`;
  await execEcho(trimCmd);
}

async function runCmd(): Promise<number> {
  const cmd = (process.argv[2] || defaultCmd).toLowerCase();
  if (cmd === "--tasks" || cmd === "--help") {
    console.log(`tasks: ${[...taskMap.keys()].join("\n       ")}`);
    return 0;
  } else {
    const foundTask = taskMap.get(cmd.toLowerCase());
    if (foundTask) {
      return foundTask();
    } else {
      console.error(`build command: "${cmd}" not found`);
      return 1;
    }
  }
}

async function execEcho(cmd: string): Promise<void> {
  const exec = execPromise(cmd);
  exec.child.stdout?.pipe(process.stdout);
  exec.child.stderr?.pipe(process.stderr);
  await exec;
}

async function execOut(cmd: string): Promise<string> {
  const exec = execPromise(cmd);
  exec.child.stderr?.pipe(process.stderr);
  const result = await exec;
  return result.stdout.trimEnd();
}

runCmd().then(() => 0);
