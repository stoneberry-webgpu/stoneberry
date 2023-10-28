import { PrefixScan } from "stoneberry/scan";
import { ComposableShader } from "thimbleberry";
import { prefixScanBench } from "./prefixScanBench.js";
import { ShaderAndSize, benchRunner } from "./benchRunner.js";

main();

async function main(): Promise<void> {
  // const benches = [benchScan, benchReduceBuffer, benchReduceTexture, benchHistogramTexture];
  const benches = [{ makeShader: (d: GPUDevice) => prefixScanBench(d, 2 ** 27) }];
  await benchRunner(benches);
}

// async function benchScan(device: GPUDevice): Promise<NamedBenchResult> {
//   const size = 2 ** 27;
//   const benchResult = await prefixScanBench(device, size, 100);
//   return { name: "scan", benchResult, elems: size };
// }

// async function benchReduceBuffer(device: GPUDevice): Promise<NamedBenchResult> {
//   const size = 2 ** 27;
//   const benchResult = await reduceBufferBench(device, size, 100);
//   return { name: "reduceBuffer", benchResult, elems: size };
// }

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
