import { PrefixScan } from "stoneberry/scan";
import { bufferI32 } from "thimbleberry";
import { renderTable, withGpuDevice } from "stoneberry-examples";

withGpuDevice(main);

async function main(device: GPUDevice): Promise<void> {
  const srcData = [1, 2, 3, 4, 5, 6];
  const source = bufferI32(device, srcData);

  const scanner = new PrefixScan({ device, source });
  const inclusiveScan = await scanner.scan();

  renderTable({ source: srcData, "inclusive scan": inclusiveScan });
}
