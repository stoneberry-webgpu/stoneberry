import maxF32wgsl from "./BinOpMaxF32.wgsl?raw";
import { BinOpModule } from "../util/BinOpModules.js";

export const maxF32: BinOpModule = {
  wgsl: maxF32wgsl,
  inputElementSize: 4,
  outputElementSize: 4,
  outputElements: "f32",
};