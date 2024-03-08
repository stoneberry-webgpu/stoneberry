import webGPU from "@webgpu/types?sourceFiles";
import { LiveTypescript, LiveTypescriptProps } from "live-typescript";
import "live-typescript/style.css";
import "react";
import exampleUtils from "stoneberry-examples?sourceFiles";
import stoneberryReduceBuffer from "stoneberry/reduce-buffer?sourceFiles";
import stoneberryReduceTexture from "stoneberry/reduce-texture?sourceFiles";
import stoneberryHistogram from "stoneberry/histogram-texture?sourceFiles";
import stoneberryScan from "stoneberry/scan?sourceFiles";
import stoneberryBinOpSumF32 from "stoneberry/binop/BinOpModuleSumF32.js?sourceFiles";
import thimbleberry from "thimbleberry?sourceFiles";

export type { LiveTypescriptProps };

export function StoneberryLive(props: LiveTypescriptProps): JSX.Element {
  return (
    <LiveTypescript
      {...{
        height: "400px",
        ...props,
        embeddedPackages: [
          thimbleberry,
          stoneberryScan,
          stoneberryReduceBuffer,
          stoneberryReduceTexture,
          stoneberryHistogram,
          stoneberryBinOpSumF32,
          exampleUtils,
          webGPU,
        ],
        visibleTypes: ["@webgpu/types"],
      }}></LiveTypescript>
  );
}
