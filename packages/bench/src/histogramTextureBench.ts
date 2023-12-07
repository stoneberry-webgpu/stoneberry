import { HistogramTexture, histogramTemplate } from "stoneberry/histogram-texture";
import { ShaderAndSize, Vec2, mapN, textureFromArray } from "thimbleberry";

export function histogramTextureBench(device: GPUDevice, size: Vec2): ShaderAndSize {
  const srcData = new Uint32Array(size[0] * size[1]);
  mapN(srcData.length, i => (srcData[i] = i & 0xff));
  const source = textureFromArray(device, srcData, size, "r32uint", "source");

  const shader = new HistogramTexture({
    device,
    source,
    blockSize: [2, 2],
    bufferBlockLength: 4,
    histogramTemplate: histogramTemplate(64),
  });

  return { shader, srcSize: size[0] * size[1] * 4 };
}
