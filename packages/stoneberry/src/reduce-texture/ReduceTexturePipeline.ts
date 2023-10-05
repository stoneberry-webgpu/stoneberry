import { Vec2, applyTemplate, memoizeWithDevice } from "thimbleberry";
import { BinOpTemplate, maxF32 } from "../util/BinOpTemplate.js";
import shaderWGSL from "./ReduceTexture.wgsl?raw";
import { LoadTemplate, loadRedComponent } from "../util/LoadTemplate.js";

export interface ReduceBufferPipelineArgs {
  device: GPUDevice;
  workgroupThreads: number;
  blockArea: number;
  reduceTemplate: BinOpTemplate;
}
export const getReduceTexturePipeline = memoizeWithDevice(createReduceTexturePipeline);

interface TextureReducePipeParams {
  device: GPUDevice;
  workgroupSize?: Vec2;
  blockLength?: number;
  reduceTemplate?: BinOpTemplate;
  loadTemplate?: LoadTemplate;
}

export function createReduceTexturePipeline(
  params: TextureReducePipeParams
): GPUComputePipeline {
  const {
    device,
    workgroupSize = [4, 4],
    blockLength = 2,
    reduceTemplate = maxF32,
    loadTemplate = loadRedComponent,
  } = params;

  const bindGroupLayout = device.createBindGroupLayout({
    label: "reduceTexture",
    entries: [
      {
        binding: 0, // uniforms
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "uniform",
        },
      },
      {
        binding: 1, // src density texture
        visibility: GPUShaderStage.COMPUTE,
        texture: {
          sampleType: "unfilterable-float",
        },
      },
      {
        binding: 2, // reduced values output (also used as input for intermediate level reductions)
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
        },
      },
      {
        binding: 11, // debug buffer
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
        },
      },
    ],
  });

  const processedWGSL = applyTemplate(shaderWGSL, {
    workgroupSizeX: workgroupSize[0],
    workgroupSizeY: workgroupSize[1],
    workgroupThreads: workgroupSize[0] * workgroupSize[1],
    blockLength,
    blockArea: blockLength * blockLength,
    ...reduceTemplate,
    ...loadTemplate,
  });

  const module = device.createShaderModule({
    code: processedWGSL,
  });

  const reduceTexture = device.createComputePipeline({
    label: "reduceTexture pipeline",
    compute: {
      module,
      entryPoint: "reduceFromTexture",
    },
    layout: device.createPipelineLayout({
      label: "reduceTexture pipeline layout",
      bindGroupLayouts: [bindGroupLayout],
    }),
  });

  return reduceTexture;
}
