import { PrefixScan } from "stoneberry/scan";
import { ComposableShader } from "thimbleberry";
import { prefixScanBench } from "./prefixScanBench.js";
import { benchRunner } from "./benchRunner.js";

const scanElems = 2 ** 27;

main();

async function main(): Promise<void> {
  // const benches = [benchScan, benchReduceBuffer, benchReduceTexture, benchHistogramTexture];
  const benches = [{ name: "scan", makeShader: makeScan, srcSize: scanElems * 4 }];
  await benchRunner(benches);
}

function makeScan(device: GPUDevice): ComposableShader {
  const source = device.createBuffer({
    label: "source",
    size: scanElems * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  const srcData = new Uint32Array(source.getMappedRange());
  for (let i = 0; i < srcData.length; i++) {
    // set just a few values to 1, so we can validate the sum w/o uint32 overflow
    srcData[i] = i & 0x111111 ? 0 : 1;
  }
  source.unmap();
  const scan = new PrefixScan({ device, source, forceWorkgroupLength: 256 });
  return scan;
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
