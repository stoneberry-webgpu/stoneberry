import { sumU32 } from "stoneberry/reduce-buffer";
import { Vec2 } from "thimbleberry";
import { ReduceTexture } from './../../stoneberry/src/reduce-texture/ReduceTexture';
import { BenchResult, benchShader } from "./benchShader.js";
import { sumF32 } from "stoneberry/reduce-texture";

export async function reduceTextureBench(
  device: GPUDevice,
  size: Vec2,
  runs = 1
): Promise<BenchResult> {

  const texture = device.createTexture({
    label: "source",
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    size,
    format: "r32uint"
  });

  const srcData = new Uint32Array(size[0] * size[1]);
  for (let i = 0; i < srcData.length; i++) {
    // set just a few values to 1, so we can validate the sum w/o uint32 overflow
    srcData[i] = i & 0x111111 ? 0 : 1;
  }
  const expected = srcData.reduce((a, b) => a + b);

  const components = 1;
  const componentByteSize = 4;
  device.queue.writeTexture(
    { texture },
    srcData,
    {
      bytesPerRow: size[0] * componentByteSize * components,
      rowsPerImage: size[1],
    },
    size
  );
  const reduce = new ReduceTexture({
    device,
    source: texture,
    reduceTemplate: sumU32,
    loadComponent: "r",
    forceWorkgroupSize: [8,8],
    blockSize: [2,2],
    bufferBlockLength: 4,
  });

  // verify correctness
  const result = await reduce.reduce();
  if (result[0] !== expected) throw new Error(`expected ${expected}, got ${result[0]}`);

  // run benchmark
  return benchShader({ device, runs }, reduce);
}
