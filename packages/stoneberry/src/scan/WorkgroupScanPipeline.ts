import { applyTemplate, memoizeWithDevice } from "thimbleberry";
import { ScanTemplate } from "./ScanTemplate.js";
import shaderWGSL from "./WorkgroupScan.wgsl?raw";
import { sumU32 } from "../util/BinOpTemplate.js";

interface WorkGroupScanPipelineArgs {
  device: GPUDevice;
  workgroupSize: number;
  blockSums: boolean;
  template: ScanTemplate;
}

/** @internal */
export const getWorkgroupScanPipeline = memoizeWithDevice(createWorkgroupScanPipeline);

function createWorkgroupScanPipeline(
  params: WorkGroupScanPipelineArgs
): GPUComputePipeline {
  const { device, workgroupSize, blockSums = true } = params;
  const { template = sumU32 } = params;
  let blockSumsEntry: GPUBindGroupLayoutEntry[] = [];
  if (blockSums) {
    blockSumsEntry = [
      {
        binding: 3, // output block sums
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
    ];
  }

  const firstBindGroupLayout = device.createBindGroupLayout({
    label: "workgroup scan layout",
    entries: [
      {
        binding: 0, // uniforms
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
      {
        binding: 1, // src buffer
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 2, // output prefix sums
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      ...blockSumsEntry,
      {
        binding: 11, // debug buffer
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
    ],
  });

  const processedWGSL = applyTemplate(shaderWGSL, {
    workgroupSizeX: workgroupSize,
    blockSums,
    ...template,
  });

  const module = device.createShaderModule({
    code: processedWGSL,
  });

  const pipeline = device.createComputePipeline({
    compute: {
      module,
      entryPoint: "workgroupPrefixScan",
    },
    layout: device.createPipelineLayout({ bindGroupLayouts: [firstBindGroupLayout] }),
  });

  return pipeline;
}
