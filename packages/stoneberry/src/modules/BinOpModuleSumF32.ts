import sumF32wgsl from "./BinOpSumF32.wgsl?raw";
import { BinOpModule } from "../util/BinOpModules.js";

export const sumF32: BinOpModule = {
  wgsl: sumF32wgsl,
  inputElementSize: 4,
  outputElementSize: 4,
  outputElements: "f32",
};

