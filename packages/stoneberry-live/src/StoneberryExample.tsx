import "react";
import { CodeExample } from "live-typescript";
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
  const embeddedPackages = { ...thimbleberry, ...stoneberryScan, ...examples };
  const { code, className } = props;
  const typeFiles = {
    ...thimbleberryTypes,
    ...stoneberryTypes,
    ...examplesTypes,
    ...webGpuTypes,
  };
  return (
    <CodeExample {...{ embeddedPackages, typeFiles, code, className }}></CodeExample>
  );
}
