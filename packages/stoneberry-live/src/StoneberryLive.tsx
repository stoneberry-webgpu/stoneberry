import "react";
import { LiveTypescript } from "live-typescript";
import "live-typescript/style.css";
import thimbleberry from "thimbleberry?remapImports";
import stoneberryScan from "stoneberry/scan?remapImports";
import examples from "stoneberry-examples?remapImports";
import examplesTypes from "stoneberry-examples?typeFiles";
import thimbleberryTypes from "thimbleberry?typeFiles";
import stoneberryTypes from "stoneberry?typeFiles";
import webGpuTypes from "@webgpu/types?typeFiles";

export interface StoneberryLiveProps {
  code: string;
  className?: string;
}

export function StoneberryLive(props: StoneberryLiveProps): JSX.Element {
  const { code, className } = props;
  return (
    <LiveTypescript
      embeddedPackages={{ ...thimbleberry, ...stoneberryScan, ...examples }}
      typeFiles={{
        ...thimbleberryTypes,
        ...stoneberryTypes,
        ...examplesTypes,
        ...webGpuTypes,
      }}
      {...{ code, className }}></LiveTypescript>
  );
}
