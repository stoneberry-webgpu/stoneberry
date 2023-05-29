import { Sandpack } from "@codesandbox/sandpack-react";
import simpleScan from "!!raw-loader!../../../examples/src/simpleScan.ts?raw";
import renderTable from "!!raw-loader!../../../examples/src/exampleUtils.ts?raw";
import tsconfig from "!!raw-loader!../../../examples/tsconfig.json?raw";
import indexHtml from "!!raw-loader!../../../examples/index.html?raw";

import React from "react";

export function MainExample(): JSX.Element {
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
        "/src/simpleScan.ts": simpleScan,
        "/src/exampleUtils.ts": renderTable,
        "tsconfig.json": tsconfig,
        "/index.html": indexHtml,
      }}
    />
  );
}
