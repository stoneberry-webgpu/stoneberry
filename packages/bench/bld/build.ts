import { exec } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { writeGitVersionTs } from "./extractGitVersion.js";

const execPromise = promisify(exec);

const benchWebPort = 3100;
const defaultCmd = "bench";
const benchResultsPort = 9292;

const taskMap = new Map<string, any>([
  ["version", version],
  ["dev", dev],
  ["bench", bench],
  ["bench-dev", benchDev],
  ["bench-browser", benchBrowser],
]);

export async function version(): Promise<string> {
  return writeGitVersionTs("version/gitVersion.ts");
}

export async function dev(): Promise<void> {
  const server = await createViteServer();
  await server.listen(benchWebPort);
  await benchBrowser();
}

export async function bench(outfile="benchmarks.csv", gitCheck=true): Promise<void> {
  const rev = await version();
  const server = await createViteServer();
  await server.listen(benchWebPort);

  if (gitCheck && rev.endsWith("*")) {
    // uncommitted changes, don't save reports
    console.warn("uncommitted changes, not saving benchmarks");
    await benchBrowser();
  } else {
    // record benchmark results from the browser via websocket
    stdExec(`websocat -s ${benchResultsPort} --no-line >> ${outfile}`);
    await benchBrowser({ reportPort: benchResultsPort.toString() });
  }
}

/** run the benchmarks out to temp file */
export async function benchDev():Promise<void> {
  return bench("benchmarks-dev.csv", false);
}

export async function benchBrowser(searchParams?: Record<string, string>): Promise<void> {
  const query = searchParams ? "?" + new URLSearchParams(searchParams) : "";
  // TODO implement for windows
  const browserCmd =
    `open -a "Google Chrome Canary" http://localhost:${benchWebPort}/${query} --args` +
    " --enable-dawn-features=allow_unsafe_apis" +
    " --profile-directory=bench";
  console.log(browserCmd);
  await stdExec(browserCmd);
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
