import sumU32wgsl from "./BinOpSumU32.wgsl?raw";
import { BinOpModule } from "../util/BinOpModules.js";

export const sumU32: BinOpModule = {
  wgsl: sumU32wgsl,
  outputElementSize: 4,
  inputElementSize: 4,
  outputElements: "u32",
};