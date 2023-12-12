import minMaxF32wgsl from "./BinOpMinMaxF32.wgsl?raw";
import { BinOpModule } from "../util/BinOpModules.js";

export const minMaxF32: BinOpModule = {
  wgsl: minMaxF32wgsl,
  inputElementSize: 8,
  outputElementSize: 8,
  outputElements: "f32",
};
