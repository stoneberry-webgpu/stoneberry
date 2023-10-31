import { exec } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { writeGitVersionTs } from "./extractGitVersion.js";
import fs from "fs/promises";

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
  ["bench:split", benchSplit],
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
    stdExec(`websocat -B 4194304 -s ${benchResultsPort} --no-line >> ${outfile}`);
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
  await stdExec(browserCmd);
}

export async function benchSplit(): Promise<void> {
  const cmd =
    "awk -v date=$(date '+%Y-%b-%d_%H-%M-%S') -f split-details.awk benchmarks-details.csv";
  console.log(cmd);
  await stdExec(cmd);
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

async function stdExec(cmd: string): Promise<void> {
  const exec = execPromise(cmd);
  exec.child.stdout?.pipe(process.stdout);
  exec.child.stderr?.pipe(process.stderr);
  await exec;
}

runCmd().then(() => 0);
