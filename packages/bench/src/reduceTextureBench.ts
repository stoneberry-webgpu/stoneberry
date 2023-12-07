import { sumU32 } from "stoneberry/reduce-buffer";
import { ShaderAndSize, Vec2, textureFromArray } from "thimbleberry";
import { ReduceTexture } from "./../../stoneberry/src/reduce-texture/ReduceTexture";

export async function reduceTextureBench(
  device: GPUDevice,
  size: Vec2
): Promise<ShaderAndSize> {
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
    sourceComponent: "r",
    forceWorkgroupSize: [32, 8],
    blockSize: [2, 2],
    bufferBlockLength: 4,
  });

  // run once to verify correctness
  const result = await reduce.reduce();
  if (result[0] !== expected) throw new Error(`expected ${expected}, got ${result[0]}`);

  return { shader: reduce, srcSize: size[0] * size[1] * 4 };
}
