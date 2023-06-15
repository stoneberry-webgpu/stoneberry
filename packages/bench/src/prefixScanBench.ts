import { PrefixScan } from "stoneberry/scan";
import { filledGPUBuffer } from "thimbleberry";
import { benchShader } from "./benchShader.js";

export async function prefixScanBench(device: GPUDevice): Promise<any> {
  const srcData = Array.from({ length: 2 ** 23 }, (_, i) => i);
  const src = filledGPUBuffer(
    device,
    srcData,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    "source",
    Uint32Array
  );
  const scan = new PrefixScan({ device, src, label: "scan" });
  return benchShader(device, 300, scan);
}
