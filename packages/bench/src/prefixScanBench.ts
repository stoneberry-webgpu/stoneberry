import { PrefixScan } from "stoneberry/scan";
import { filledGPUBuffer } from "thimbleberry";
import { BenchResult, benchShader } from "./benchShader.js";

export async function prefixScanBench(device: GPUDevice): Promise<BenchResult> {
  const srcData = Array.from({ length: 2 ** 25 }, (_, i) => i & 0x1);
  const src = filledGPUBuffer(
    device,
    srcData,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    "source",
    Uint32Array
  );
  const scan = new PrefixScan({ device, src });
  return benchShader(device, 50, scan);
}
