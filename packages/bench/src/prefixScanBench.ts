import { PrefixScan } from "stoneberry/scan";
import { BenchResult, benchShader } from "./benchShader.js";

export async function prefixScanBench(
  device: GPUDevice,
  size: number,
  runs = 1
): Promise<BenchResult> {
  const srcData = new Uint32Array(size);
  for (let i = 0; i < srcData.length; i++) {
    // set just a few values to 1, so we can validate the sum w/o uint32 overflow
    srcData[i] = i & 0x111111 ? 0 : 1;
  }

  const src = device.createBuffer({
    label: "source",
    size: srcData.length * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  src.unmap();
  const scan = new PrefixScan({ device, src });
  return benchShader({ device, runs }, scan);
}
