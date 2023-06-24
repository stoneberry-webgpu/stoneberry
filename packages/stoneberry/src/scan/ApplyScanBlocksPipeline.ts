import { memoizeWithDevice } from "thimbleberry";
import { applyTemplate } from "thimbleberry";
import shaderWGSL from "./ApplyScanBlocks.wgsl?raw";
import { BinOpTemplate, sumU32 } from "../util/BinOpTemplate.js";

/** @internal */
export interface ApplyScanBlocksPipelineArgs {
  device: GPUDevice;
  workgroupLength: number;
  template?: BinOpTemplate;
}

/** @internal */
export const getApplyBlocksPipeline = memoizeWithDevice(createApplyBlocksPipeline);

function createApplyBlocksPipeline(
  args: ApplyScanBlocksPipelineArgs
): GPUComputePipeline {
  const { device, workgroupLength, template = sumU32 } = args;
  const firstBindGroupLayout = device.createBindGroupLayout({
    label: "apply scan blocks",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
      {
        binding: 2, // input partial prefix scan
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 3, // input block sums
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 4, // output prefix sums
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 11, // debug buffer
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
    ],
  });

  const processedWGSL = applyTemplate(shaderWGSL, {
    workgroupSizeX: workgroupLength,
    ...template,
  });

  const module = device.createShaderModule({
    code: processedWGSL,
  });

  const pipeline = device.createComputePipeline({
    compute: {
      module,
      entryPoint: "applyScanBlocks",
    },
    layout: device.createPipelineLayout({ bindGroupLayouts: [firstBindGroupLayout] }),
  });

  return pipeline;
}
