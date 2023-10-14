import { applyTemplate, memoizeWithDevice } from "thimbleberry";
import { BinOpTemplate } from "../util/BinOpTemplate.js";
import shaderWGSL from "./ReduceHistogram.wgsl?raw";

export interface HistogramPipelineArgs {
  device: GPUDevice;
  workgroupThreads: number;
  blockArea: number;
  reduceTemplate: BinOpTemplate;
  histogramSize: number;
}
export const getHistogramPipeline = memoizeWithDevice(createHistogramPipeline);

function createHistogramPipeline(params: HistogramPipelineArgs): GPUComputePipeline {
  const { device, workgroupThreads, blockArea = 4 } = params;
  const { reduceTemplate, histogramSize } = params;

  const bindGroupLayout = device.createBindGroupLayout({
    label: "histogram",
    entries: [
      {
        binding: 0, // uniforms
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform", hasDynamicOffset: true },
      },
      {
        binding: 1, // reduced values input
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 2, // reduced values output
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
    workgroupThreads,
    blockArea,
    histogramSize,
    ...reduceTemplate,
  });

  const module = device.createShaderModule({
    code: processedWGSL,
  });

  const pipeline = device.createComputePipeline({
    label: "histogram",
    compute: {
      module,
      entryPoint: "reduceHistogramBuffer",
    },
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
  });

  return pipeline;
}
