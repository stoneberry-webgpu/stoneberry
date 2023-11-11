import { applyTemplate, memoizeWithDevice } from "thimbleberry";

export interface ComputePipelineArgs {
  device: GPUDevice;
  wgsl: string;
  wgslParams?: Record<string, any>;
  label?: string;
  bufferBindings?: GPUBufferBindingLayout[];
  debugBuffer?: boolean;
}

export interface ComputePipelineResults {
  pipeline: GPUComputePipeline;
}

/** Create a cached GPUComputePipeline */
export const computePipeline = memoizeWithDevice(makeComputePipeline);

function makeComputePipeline(args: ComputePipelineArgs): ComputePipelineResults {
  const { device, wgsl, wgslParams = {} } = args;
  const { debugBuffer = false, bufferBindings = [], label = "computeShader" } = args;
  const entries = bufferBindings.map((binding, i) => ({
    binding: i,
    visibility: GPUShaderStage.COMPUTE,
    buffer: binding,
  }));
  if (debugBuffer) {
    entries.push({
      binding: 11, // debug buffer
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "storage" },
    });
  }

  const bindGroupLayout = device.createBindGroupLayout({
    label,
    entries,
  });

  const processedWGSL = applyTemplate(wgsl, wgslParams);

  const module = device.createShaderModule({
    code: processedWGSL,
  });

  const pipeline = device.createComputePipeline({
    label,
    compute: {
      module,
      entryPoint: "main",
    },
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
  });

  return { pipeline };
}
