import "react";
import { LiveTypescript } from "live-typescript";
import "live-typescript/style.css";
import thimbleberry from "thimbleberry?sourceFiles";
import stoneberryScan from "stoneberry/scan?sourceFiles";
import examples from "stoneberry-examples?sourceFiles";
import webGPU from "@webgpu/types?sourceFiles";

export interface StoneberryLiveProps {
  code: string;
  className?: string;
}

export function StoneberryLive(props: StoneberryLiveProps): JSX.Element {
  const { code, className } = props;
  return (
    <LiveTypescript
      {...{
        code,
        className,
        embeddedPackages: [thimbleberry, stoneberryScan, examples, webGPU],

        visibleTypes: ["@webgpu/types"],
      }}></LiveTypescript>
  );
}
