import { renderTable, withGpuDevice } from "stoneberry-examples";
import { HistogramTexture, makeHistogramTemplate } from "stoneberry/histogram-texture";
import { Vec2, makeTexture } from "thimbleberry";

withGpuDevice(main);

async function main(device: GPUDevice): Promise<void> {
  const srcData = [[1, 2, 2, 2, 3, 4, 4, 4]];
  const source = makeTexture(device, srcData, "r32uint");
  const histogramTemplate = makeHistogramTemplate(4, "u32");
  const range: Vec2 = [1, 4];
  const shader = new HistogramTexture({ device, source, histogramTemplate, range });
  const histogram = await shader.histogram();

  renderTable({ source: srcData.flat(), histogram });
}
