import { PrefixScan } from "stoneberry/scan";
import { bufferI32, ShaderGroup, copyBuffer } from "thimbleberry";
import { renderTable, withGpuDevice } from "stoneberry-examples";

withGpuDevice(main);

async function main(device: GPUDevice): Promise<void> {
  const srcData = [1, 2, 3, 4, 5, 6];
  const source = bufferI32(device, srcData);

  const prefixScan = new PrefixScan({ device, source, exclusive: true, initialValue: 19 });

  // note dynamic link to previous
  const otherShader = new PrefixScan({ device, source: () => prefixScan.result });

  // launch shaders
  const group = new ShaderGroup(device, prefixScan, otherShader);
  group.dispatch();

  // collect results
  const exclusiveScan = await copyBuffer(device, prefixScan.result);
  const doubleScan = await copyBuffer(device, otherShader.result);
  renderTable({ source: srcData, exclusiveScan, doubleScan });
}
