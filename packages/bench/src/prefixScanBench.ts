import { PrefixScan } from "stoneberry/scan";
import { ShaderAndSize } from "./benchRunner.js";

export function prefixScanBench(device: GPUDevice, elems: number): ShaderAndSize {
  const source = device.createBuffer({
    label: "source",
    size: elems * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  const srcData = new Uint32Array(source.getMappedRange());
  for (let i = 0; i < srcData.length; i++) {
    // set just a few values to 1, so we can validate the sum w/o uint32 overflow
    srcData[i] = i & 0x111111 ? 0 : 1;
  }
  source.unmap();
  const scan = new PrefixScan({ device, source, forceWorkgroupLength: 256 });

  return { shader: scan, srcSize: elems * 4 };
}