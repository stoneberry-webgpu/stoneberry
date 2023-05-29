import { Sandpack } from "@codesandbox/sandpack-react";
import exampleUtils from "!!raw-loader!../../../examples/src/exampleUtils.ts?raw";
import simpleScan from "!!raw-loader!../../../examples/src/simpleScan.ts?raw";
import tsconfig from "!!raw-loader!../../../examples/tsconfig.json?raw";
import indexHtml from "!!raw-loader!../../../examples/index.html?raw";

import React from "react";

export interface ExampleProps {
  tsFile: string;
}

export function MainExample(props: ExampleProps): JSX.Element {
  const { tsFile } = props;
  console.log("props", props);
  return (
    <Sandpack
      template="vite"
      options={{
        editorHeight: 400,
        editorWidthPercentage: 60,
        visibleFiles: ["/src/simpleScan.ts"],
        activeFile: "/src/simpleScan.ts",
      }}
      customSetup={{
        dependencies: {
          stoneberry: "latest",
          thimbleberry: "latest",
        },
        entry: "/src/simpleScan.ts",
      }}
      files={{
        "/src/simpleScan.ts": tsFile,
        "/src/exampleUtils.ts": exampleUtils,
        "tsconfig.json": tsconfig,
        "/index.html": indexHtml,
      }}
    />
  );
}
