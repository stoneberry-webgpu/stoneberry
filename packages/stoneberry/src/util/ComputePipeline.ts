import { memoizeWithDevice } from "thimbleberry";
import { ModuleRegistry } from "wgsl-linker";
import { simpleTemplate } from "wgsl-linker/templates";

export type BindingEntry =
  | Pick<GPUBindGroupLayoutEntry, "buffer">
  | Pick<GPUBindGroupLayoutEntry, "sampler">
  | Pick<GPUBindGroupLayoutEntry, "texture">
  | Pick<GPUBindGroupLayoutEntry, "storageTexture">
  | Pick<GPUBindGroupLayoutEntry, "externalTexture">;

export interface ComputePipelineArgs {
  device: GPUDevice;

  /** shader main module name or path, defaults to "main" */
  mainModule?: string;

  /** portion of a GPUBindGroupLayoutEntry, for defining binding layout */
  bindings: BindingEntry[];

  /** string substititions for wgsl templating */
  wgslParams?: Record<string, any>;

  /** registry of modules available for linking */
  registry: ModuleRegistry;

  /** debug label */
  label?: string;

  /** use binding 11 for a debug buffer */
  debugBuffer?: boolean;

  /** constants for wgsl override variables */
  constants?: Record<string, GPUPipelineConstantValue>;

  /** (for debug) log the linked shader to the javascript console */
  logShader?: boolean;
}

export interface ComputePipelineResults {
  pipeline: GPUComputePipeline;
}

/** Create a cached GPUComputePipeline */
export const computePipeline = memoizeWithDevice(makeComputePipeline);

function makeComputePipeline(args: ComputePipelineArgs): ComputePipelineResults {
  const {
    device,
    mainModule = "main",
    wgslParams = {},
    constants,
    registry,
    logShader,
  } = args;
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

  // dlog({ wgslParams });
  const bindGroupLayout = device.createBindGroupLayout({
    label,
    entries,
  });

  registry?.registerTemplate(simpleTemplate);
  // console.log("wgsl\n", wgsl);
  const linkedWgsl = registry.link(mainModule, wgslParams);

  if (logShader) {
    const lines = linkedWgsl.split("\n");
    const numbered = lines.map((line, i) => `${i + 1}: ${line}`);
    console.log(numbered.join("\n"));
  }

  const module = device.createShaderModule({
    code: linkedWgsl,
  });

  const pipeline = device.createComputePipeline({
    label,
    compute: {
      module,
      entryPoint: "main",
      constants,
    },
    layout: device.createPipelineLayout({
      label: label,
      bindGroupLayouts: [bindGroupLayout],
    }),
  });

  return { pipeline };
}