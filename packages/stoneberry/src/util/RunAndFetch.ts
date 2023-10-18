import { ComposableShader, GPUElementFormat, withBufferCopy } from "thimbleberry";

interface ResultComponent extends ComposableShader {
  result: GPUBuffer;
  device: GPUDevice;
}

export async function runAndFetchResult(
  component: ResultComponent,
  format: GPUElementFormat,
  label?: string
): Promise<number[]> {
  const device = component.device;
  const commands = device.createCommandEncoder({
    label,
  });
  component.commands(commands);
  device.queue.submit([commands.finish()]);
  await device.queue.onSubmittedWorkDone();

  if (!format) {
    throw new Error(
      `outputElement format not defined:`
    );
  }
  const data = await withBufferCopy(device, component.result, format, d => d.slice());
  return [...data];
}
