import { renderTable, withGpuDevice } from "stoneberry-examples";
import { ReduceTexture, sumF32 } from "stoneberry/reduce-texture";
import { makeTexture, printTexture } from "thimbleberry";

withGpuDevice(main);

async function main(device: GPUDevice): Promise<void> {
  const srcData = [[1, 2, 3, 4, 5]];
  const source = makeTexture(device, srcData, "r16float");
  await printTexture(device, source);

  const reducer = new ReduceTexture({ device, source: source, reduceTemplate: sumF32 });
  const reduced = await reducer.reduce();

  renderTable({ source: srcData[0], sum: reduced });
}
