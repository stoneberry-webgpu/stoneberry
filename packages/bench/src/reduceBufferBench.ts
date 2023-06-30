import { ReduceBuffer, sumU32 } from "stoneberry/reduce-buffer";
import { BenchResult, benchShader } from "./benchShader.js";

export async function reduceBufferBench(
  device: GPUDevice,
  size: number,
  runs = 1
): Promise<BenchResult> {
  const source = device.createBuffer({
    label: "source",
    size: size * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  const srcData = new Uint32Array(source.getMappedRange());
  for (let i = 0; i < srcData.length; i++) {
    // set just a few values to 1, so we can validate the sum w/o uint32 overflow
    srcData[i] = i & 0x111111 ? 0 : 1;
  }
  const expected = srcData.reduce((a, b) => a + b);
  source.unmap();
  const reduce = new ReduceBuffer({ device, source, template: sumU32, blockLength: 4 });

  // verify correctness
  const result = await reduce.reduce();
  if (result[0] !== expected) throw new Error(`expected ${expected}, got ${result[0]}`);

  // run benchmark
  return benchShader({ device, runs }, reduce);
}