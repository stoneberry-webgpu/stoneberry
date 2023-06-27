import { PrefixScan } from "stoneberry/scan";
import { BenchResult, benchShader } from "./benchShader.js";

export async function prefixScanBench(
  device: GPUDevice,
  size: number,
  runs = 1
): Promise<BenchResult> {

  const source = device.createBuffer({
    label: "source",
    size: size * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  const srcData = new Uint32Array(source.getMappedRange());
  for (let i = 0; i < srcData.length; i++) {
    // set just a few values to 1, so we can validate the sum w/o uint32 overflow
    srcData[i] = i & 0x111111 ? 0 : 1;
  }
  source.unmap();
  const scan = new PrefixScan({ device, source });
  return benchShader({ device, runs }, scan);
}
