import { ComposableShader, GPUElementFormat, withBufferCopy } from "thimbleberry";
import { OutputTemplate } from "./BinOpTemplate.js";

interface ResultComponent extends ComposableShader {
  result: GPUBuffer;
  device: GPUDevice;
}

export async function runAndFetchResult(
  component: ResultComponent,
  template?: OutputTemplate,
  format?: GPUElementFormat,
  label?: string
): Promise<number[]> {
  const device = component.device;
  const commands = device.createCommandEncoder({
    label,
  });
  component.commands(commands);
  device.queue.submit([commands.finish()]);
  await device.queue.onSubmittedWorkDone();

  const elemFormat = format || template?.outputElements;
  if (!elemFormat) {
    throw new Error(
      `outputElement format not defined: ${JSON.stringify(template, null, 2)}`
    );
  }
  const data = await withBufferCopy(device, component.result, elemFormat, d => d.slice());
  return [...data];
}
