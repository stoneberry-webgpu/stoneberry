import {
  Vec2,
  applyTemplate,
  memoizeWithDevice,
  texelLoadType,
  textureSampleType,
} from "thimbleberry";
import { BinOpTemplate } from "../util/BinOpTemplate.js";
import { LoadTemplate, loadRedComponent } from "../util/LoadTemplate.js";
import shaderWGSL from "./ReduceTexture.wgsl?raw";

export interface ReduceBufferPipelineArgs {
  device: GPUDevice;
  workgroupThreads: number;
  blockArea: number;
  reduceTemplate: BinOpTemplate;
}
export const getReduceTexturePipeline = memoizeWithDevice(createReduceTexturePipeline);

interface TextureReducePipeParams {
  device: GPUDevice;
  reduceTemplate: BinOpTemplate;
  textureFormat: GPUTextureFormat;
  workgroupSize?: Vec2;
  blockLength?: number;
  loadTemplate?: LoadTemplate;
}

export function createReduceTexturePipeline(
  params: TextureReducePipeParams
): GPUComputePipeline {
  const {
    device,
    workgroupSize = [4, 4],
    blockLength = 2,
    loadTemplate = loadRedComponent,
    textureFormat,
    reduceTemplate,
  } = params;

  const sampleType = textureSampleType(textureFormat);
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
          sampleType,
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
  const texelType = texelLoadType(textureFormat);

  const processedWGSL = applyTemplate(shaderWGSL, {
    blockLength,
    texelType,
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
      constants: {
        workgroupThreads: workgroupSize[0] * workgroupSize[1],
        workgroupSizeX: workgroupSize[0],
        workgroupSizeY: workgroupSize[1],
      }
    },
    layout: device.createPipelineLayout({
      label: "reduceTexture pipeline layout",
      bindGroupLayouts: [bindGroupLayout],
    }),
  });

  return reduceTexture;
}
