import { benchRunner } from "./benchRunner.js";
import { histogramTextureBench } from "./histogramTextureBench.js";
import { prefixScanBench } from "./prefixScanBench.js";
import { reduceBufferBench } from "./reduceBufferBench.js";
import { reduceTextureBench } from "./reduceTextureBench.js";

main();

async function main(): Promise<void> {
  const benches = [
    { makeShader: (d: GPUDevice) => prefixScanBench(d, 2 ** 27) },
    { makeShader: (d: GPUDevice) => reduceBufferBench(d, 2 ** 27) },
    { makeShader: (d: GPUDevice) => reduceTextureBench(d, [2 ** 13, 2 ** 13]) },
    { makeShader: (d: GPUDevice) => histogramTextureBench(d, [2 ** 13, 2 ** 13]) },
  ];
  await benchRunner(benches);
}
