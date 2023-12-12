import { renderTable, withGpuDevice } from "stoneberry-examples";
import { HistogramTexture, histogramModule } from "stoneberry/histogram-texture";
import { Vec2, makeTexture } from "thimbleberry";

withGpuDevice(main);

async function main(device: GPUDevice): Promise<void> {
  const srcData = [[1, 2, 2, 2, 3, 4, 4, 4]];
  const source = makeTexture(device, srcData, "r32uint");
  const histogramOps = histogramModule(4);
  const range: Vec2 = [1, 4];
  const shader = new HistogramTexture({ device, source, histogramOps, range });
  const histogram = await shader.histogram();

  renderTable({ source: srcData.flat(), histogram });
}
