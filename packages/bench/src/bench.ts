import { benchRunner } from "thimbleberry";
import { gitVersion } from "../version/gitVersion.js";
import { histogramTextureBench } from "./histogramTextureBench.js";
import { prefixScanBench } from "./prefixScanBench.js";
import { reduceBufferBench } from "./reduceBufferBench.js";
import { reduceTextureBench } from "./reduceTextureBench.js";

main();

async function main(): Promise<void> {
  const benches = [
    benchable(reduceBufferBench, 2 ** 12),
    benchable(reduceTextureBench, [2 ** 13, 2 ** 13]),
    benchable(histogramTextureBench, [2 ** 13, 2 ** 13]),
    benchable(prefixScanBench, 2 ** 27),
  ];
  await benchRunner(benches, { gitVersion });
}

function benchable<T, U>(fn: (device: GPUDevice, p: T) => U, param: T): any {
  return { makeShader: (device: GPUDevice) => fn(device, param) };
}
