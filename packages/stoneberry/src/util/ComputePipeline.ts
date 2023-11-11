import { applyTemplate, memoizeWithDevice } from "thimbleberry";

export type BindingEntry =
  | Pick<GPUBindGroupLayoutEntry, "buffer">
  | Pick<GPUBindGroupLayoutEntry, "sampler">
  | Pick<GPUBindGroupLayoutEntry, "texture">
  | Pick<GPUBindGroupLayoutEntry, "storageTexture">
  | Pick<GPUBindGroupLayoutEntry, "externalTexture">;

export interface ComputePipelineArgs {
  device: GPUDevice;
  wgsl: string;
  bindings: BindingEntry[];
  wgslParams?: Record<string, any>;
  label?: string;
  debugBuffer?: boolean;
  constants?: Record<string, GPUPipelineConstantValue>;
}

export interface ComputePipelineResults {
  pipeline: GPUComputePipeline;
}

/** Create a cached GPUComputePipeline */
export const computePipeline = memoizeWithDevice(makeComputePipeline);

function makeComputePipeline(args: ComputePipelineArgs): ComputePipelineResults {
  const { device, wgsl, wgslParams = {}, constants } = args;
  const { debugBuffer = false, bindings, label = "computeShader" } = args;
  const entries = bindings.map((binding, i) => ({
    binding: i,
    visibility: GPUShaderStage.COMPUTE,
    ...binding,
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
      constants,
    },
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
  });

  return { pipeline };
}
