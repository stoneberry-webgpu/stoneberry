import { renderTable, withGpuDevice } from "stoneberry-examples";
import { ReduceBuffer, sumF32 } from "stoneberry/reduce-buffer";
import { bufferF32 } from "thimbleberry";

withGpuDevice(main);

async function main(device: GPUDevice): Promise<void> {
  const srcData = [1, 2, 3, 4, 5, 6];
  const source = bufferF32(device, srcData);

  const reducer = new ReduceBuffer({ device, source, binOps: sumF32 });
  const reduced = await reducer.reduce();

  renderTable({ source: srcData, reduced });
}
