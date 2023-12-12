import { renderTable, withGpuDevice } from "stoneberry-examples";
import { ReduceBuffer } from "stoneberry/reduce-buffer";
import { sumF32 } from "stoneberry/modules/BinOpModuleSumF32.js";
import { bufferF32 } from "thimbleberry";

withGpuDevice(main);

async function main(device: GPUDevice): Promise<void> {
  const srcData = [1, 2, 3, 4, 5, 6];
  const source = bufferF32(device, srcData);

  const reducer = new ReduceBuffer({ device, source, binOps: sumF32 });
  const reduced = await reducer.reduce();

  renderTable({ source: srcData, reduced });
}
