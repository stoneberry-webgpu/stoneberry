import { Sliceable } from "./Sliceable";

/** Run a function on the CPU over the copied contents of a gpu buffer.  */
export async function withBufferCopy<T>(
  device: GPUDevice,
  buffer: GPUBuffer,
  fmt: "f32" | "u8" | "u32" | "u64" | "i32" | "i8",
  fn: (data: Sliceable<number>) => T
): Promise<T> {
  const size = buffer.size;
  const copy = device.createBuffer({
    size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });
  const commands = device.createCommandEncoder({});
  commands.copyBufferToBuffer(buffer, 0, copy, 0, size);
  const cmdBuffer = commands.finish();
  device.queue.submit([cmdBuffer]);
  await copy.mapAsync(GPUMapMode.READ);
  const cpuCopy = arrayForType(fmt, copy.getMappedRange());

  try {
    return fn(cpuCopy);
  } finally {
    copy.unmap();
    copy.destroy();
  }
}

/** console.log the contents of gpu buffer */
export async function printBuffer(
  device: GPUDevice,
  buffer: GPUBuffer,
  fmt: "f32" | "u8" | "u32" | "i32" | "i8" = "f32",
  prefix?: string,
  precision?: number
): Promise<void> {
  await withBufferCopy(device, buffer, fmt, data => {
    if (buffer.label) console.log(`${prefix || ""}${buffer.label}:`);
    let stringData: string[];
    if (precision) {
      stringData = [...data].map(d => d.toPrecision(precision));
    } else {
      stringData = [...data].map(d => d.toString());
    }
    console.log("  ", stringData.join(" "));
  });
}

/** return the TypedArray for a gpu element format
 * (helpful if you want to map the gpu buffer to a ) */
export function arrayForType(
  type: "f32" | "u8" | "u32" | "u64" | "i32" | "i8",
  data: ArrayBuffer
): Float32Array | Uint8Array | Uint32Array | Int32Array | Int8Array {
  switch (type) {
    case "f32":
      return new Float32Array(data);
    case "u8":
      return new Uint8Array(data);
    case "u64":
    case "u32":
      return new Uint32Array(data);
    case "i32":
      return new Int32Array(data);
    case "i8":
      return new Int8Array(data);
  }
}
