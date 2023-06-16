import { PrefixScan } from "stoneberry/scan";
import { filledGPUBuffer } from "thimbleberry";
import { benchShader } from "./benchShader.js";

export async function prefixScanBench(device: GPUDevice): Promise<any> {
  const srcData = Array.from({ length: 2 ** 22 }, (_, i) => i & 0x1);
  const src = filledGPUBuffer(
    device,
    srcData,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    "source",
    Uint32Array
  );
  const scan = new PrefixScan({ device, src });
  return benchShader(device, 10, scan);
}
