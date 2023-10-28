import { benchRunner } from "./benchRunner.js";
import { prefixScanBench } from "./prefixScanBench.js";
import { reduceBufferBench } from "./reduceBufferBench.js";
import { reduceTextureBench } from "./reduceTextureBench.js";

main();

async function main(): Promise<void> {
  // const benches = [benchScan, benchReduceBuffer, benchReduceTexture, benchHistogramTexture];
  const benches = [
    { makeShader: (d: GPUDevice) => prefixScanBench(d, 2 ** 27) },
    { makeShader: (d: GPUDevice) => reduceBufferBench(d, 2 ** 27) },
    { makeShader: (d: GPUDevice) => reduceTextureBench(d, [2 ** 13, 2 ** 13]) },
  ];
  await benchRunner(benches);
}

// async function benchReduceTexture(device: GPUDevice): Promise<NamedBenchResult> {
//   const size = [2 ** 13, 2 ** 13] as Vec2;
//   const benchResult = await reduceTextureBench(device, size, 100);
//   return { name: "reduceTexture", benchResult, elems: size[0] * size[1] };
// }

// async function benchHistogramTexture(device: GPUDevice): Promise<NamedBenchResult> {
//   const size = [2 ** 13, 2 ** 13] as Vec2;
//   const benchResult = await histogramTextureBench(device, size, 100);
//   return { name: "histogramTexture", benchResult, elems: size[0] * size[1] };
// }
