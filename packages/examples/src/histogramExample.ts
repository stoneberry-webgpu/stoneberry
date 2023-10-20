import { renderTable, withGpuDevice } from "stoneberry-examples";
import { HistogramTexture, histogramTemplate } from "stoneberry/histogram-texture";
import { makeTexture } from "thimbleberry";

withGpuDevice(main);

async function main(device: GPUDevice): Promise<void> {
  const srcData = [
    [1, 2, 2, 2],
    [3, 4, 4, 4],
  ];
  const source = makeTexture(device, srcData, "r32uint");
  const shader = new HistogramTexture({
    device,
    source,
    histogramTemplate: histogramTemplate(4, "u32"),
    range: [1, 4],
  });
  const histogram = await shader.histogram();

  // collect results
  renderTable({ source: srcData.flat(), histogram });
}
