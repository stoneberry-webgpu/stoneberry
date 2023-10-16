import {
  Vec2,
  applyTemplate,
  memoizeWithDevice,
  texelLoadType,
  textureSampleType,
} from "thimbleberry";
import { BinOpTemplate } from "../util/BinOpTemplate.js";
import { LoadTemplate, loadRedComponent } from "../util/LoadTemplate.js";
import shaderWGSL from "./TextureToHistograms.wgsl?raw";

export const getTextureToHistogramsPipeline = memoizeWithDevice(
  createTextureToHistogramsPipeline
);

export interface TextureHistogramsPipelineArgs {
  device: GPUDevice;
  reduceTemplate: BinOpTemplate;
  textureFormat: GPUTextureFormat;
  workgroupSize?: Vec2;
  blockSize?: Vec2;
  loadTemplate?: LoadTemplate;
  numBuckets: number;
}

export function createTextureToHistogramsPipeline(
  params: TextureHistogramsPipelineArgs
): GPUComputePipeline {
  const {
    device,
    workgroupSize = [4, 4],
    blockSize = [2, 2],
    loadTemplate = loadRedComponent,
    textureFormat,
    reduceTemplate,
    numBuckets = 256,
  } = params;

  const sampleType = textureSampleType(textureFormat);
  const bindGroupLayout = device.createBindGroupLayout({
    label: "textureToHistograms",
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
        binding: 2, // min/max buffer (produced from earlier frame reduce)
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 3, // histograms bucket counts output
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
        },
      },
      {
        binding: 4, // bucket sums output
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
    texelType,
    blockWidth: blockSize[0],
    blockHeight: blockSize[1],
    blockArea: blockSize[0] * blockSize[1],
    numBuckets,
    ...reduceTemplate,
    ...loadTemplate,
    inputElements: reduceTemplate.outputElements
  });

  const module = device.createShaderModule({
    code: processedWGSL,
  });

  const pipeline = device.createComputePipeline({
    label: "textureToHistograms pipeline",
    compute: {
      module,
      entryPoint: "textureToHistograms",
      constants: {
        workgroupSizeX: workgroupSize[0],
        workgroupSizeY: workgroupSize[1],
        numBuckets,
      },
    },
    layout: device.createPipelineLayout({
      label: "textureToHistograms pipeline layout",
      bindGroupLayouts: [bindGroupLayout],
    }),
  });

  return pipeline;
}
