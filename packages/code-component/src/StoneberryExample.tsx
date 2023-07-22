import "react";
import { CodeExample } from "live-typescript";
import "live-typescript/style.css";
import thimbleberry from "thimbleberry?remapImports";
import stoneberryScan from "stoneberry/scan?remapImports";
import thimbleberryTypes from "thimbleberry?typeFiles";
import stoneberryTypes from "stoneberry?typeFiles";
import webGpuTypes from "@webgpu/types?typeFiles";

export interface StoneberryCodeExampleProps {
  code: string;
  className?: string;
}

export function StoneberryExample(
  props: StoneberryCodeExampleProps
): JSX.Element {
  const packages = ["stoneberry-examples"];
  const embeddedPackages = { ...thimbleberry, ...stoneberryScan };
  const { code, className } = props;
  const typeFiles = {
    ...thimbleberryTypes,
    ...stoneberryTypes,
    ...webGpuTypes,
  };
  return (
    <CodeExample
      {...{ packages, embeddedPackages, typeFiles, code, className }}
    ></CodeExample>
  );
}
