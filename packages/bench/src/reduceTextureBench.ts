import { sumU32 } from "stoneberry/reduce-buffer";
import { Vec2, textureFromArray } from "thimbleberry";
import { ReduceTexture } from "./../../stoneberry/src/reduce-texture/ReduceTexture";
import { BenchResult, benchShader } from "./benchShader.js";

export async function reduceTextureBench(
  device: GPUDevice,
  size: Vec2,
  runs = 1
): Promise<BenchResult> {
  const srcData = new Uint32Array(size[0] * size[1]);
  for (let i = 0; i < srcData.length; i++) {
    // set just a few values to 1, so we can validate the sum w/o uint32 overflow
    srcData[i] = i & 0x111111 ? 0 : 1;
  }
  const texture = textureFromArray(device, srcData, size, "r32uint", "source");
  const expected = srcData.reduce((a, b) => a + b);

  const reduce = new ReduceTexture({
    device,
    source: texture,
    reduceTemplate: sumU32,
    loadComponent: "r",
    forceWorkgroupSize: [32, 8],
    blockSize: [2, 2],
    bufferBlockLength: 4,
  });

  // verify correctness
  const result = await reduce.reduce();
  if (result[0] !== expected) throw new Error(`expected ${expected}, got ${result[0]}`);

  // run benchmark
  return benchShader({ device, runs }, reduce);
}
