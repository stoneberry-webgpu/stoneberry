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
  ["bench:dash", benchDash],
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
export async function benchDash(): Promise<void> {
  const date = await execOut(`date '+%Y-%b-%d_%H-%M-%S'`);
  await execEcho(
    `awk -v date=${date} -f script/split-details.awk benchmarks-details.csv`
  );

  // LATER look at argv[3] for baseline as baseline or current files
  const recentCmd = `ls -t *details*-*.csv | head -2`;
  const exec = await execPromise(recentCmd);
  const files = exec.stdout.split("\n").filter(s => s.length > 0);
  console.log(files);

  const tempDir = await fs.mkdtemp(join(os.tmpdir(), "csv-"));
  const destFiles = files.map(f => join(tempDir, f));

  for (const [i, file] of files.entries()) {
    const trimCmd = `awk -f script/trim-csv.awk ${file} > ${destFiles[i]}`;
    await execEcho(trimCmd);
  }

  const combinedCsv = join(tempDir, "combined.csv");
  const cpCmd = `cp ${destFiles[0]} ${combinedCsv}`;
  await execEcho(cpCmd);

  const concatCmd = `tail +2 ${destFiles[1]} >> ${combinedCsv}`;
  await execEcho(concatCmd);

  const compareCsv = "compare.csv";
  const noBlanksCmd = `awk NF ${combinedCsv} > ${compareCsv}`;
  await execEcho(noBlanksCmd);
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
