import { HistogramTexture, makeHistogramTemplate } from "stoneberry/histogram-texture";
import { Vec2, mapN, textureFromArray } from "thimbleberry";
import { BenchResult, benchShader } from "./benchShader.js";

export async function histogramTextureBench(
  device: GPUDevice,
  size: Vec2,
  runs = 1
): Promise<BenchResult> {
  const srcData = new Uint32Array(size[0] * size[1]);
  mapN(srcData.length, i => (srcData[i] = i & 0xff));
  const source = textureFromArray(device, srcData, size, "r32uint", "source");

  const shader = new HistogramTexture({
    device,
    source,
    blockSize: [2, 2],
    bufferBlockLength: 4,
    histogramTemplate: makeHistogramTemplate(64, "u32"),
  });

  return benchShader({ device, runs }, shader);
}
