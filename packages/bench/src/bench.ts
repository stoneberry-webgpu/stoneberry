import { MakeShader, benchRunner } from "thimbleberry";
import { histogramTextureBench } from "./histogramTextureBench.js";
import { prefixScanBench } from "./prefixScanBench.js";
import { reduceBufferBench } from "./reduceBufferBench.js";
import { reduceTextureBench } from "./reduceTextureBench.js";
import { gitVersion } from "../version/gitVersion.js";

main();

async function main(): Promise<void> {
  const benches = [
    benchable((d: GPUDevice) => reduceBufferBench(d, 2 ** 27)),
    benchable((d: GPUDevice) => reduceTextureBench(d, [2 ** 13, 2 ** 13])),
    benchable((d: GPUDevice) => histogramTextureBench(d, [2 ** 13, 2 ** 13])),
    benchable((d: GPUDevice) => prefixScanBench(d, 2 ** 27)),
  ];
  await benchRunner(benches);
}

/** attach gitVersion to all reported rows */
function benchable(makeShader: MakeShader): any {
  return { makeShader, attributes: { git: gitVersion } };
}
