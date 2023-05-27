import { PrefixScan } from "stoneberry/scan";
import { bufferI32, labeledGpuDevice } from "thimbleberry";
import { renderTable } from "./renderTable.js";

main();

async function main() {
  const device = await labeledGpuDevice();
  const srcData = [1, 2, 3, 4, 5, 6];
  const src = bufferI32(device, srcData);

  const scanner = new PrefixScan({ device, src });
  const inclusiveScan = await scanner.scan();

  renderTable({ source: srcData, "inclusive scan": inclusiveScan });
}
