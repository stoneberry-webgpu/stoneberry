import { Sandpack } from "@codesandbox/sandpack-react";
import simpleScan from "!!raw-loader!../../../examples/src/simpleScan.ts?raw";
import renderTable from "!!raw-loader!../../../examples/src/renderTable.ts?raw";
import tsconfig from "!!raw-loader!../../../examples/tsconfig.json?raw";
import indexHtml from "!!raw-loader!../../../examples/index.html?raw";

import React from "react";

export function MainExample(): JSX.Element {
  return (
    <Sandpack
      template="vite"
      options={{
        editorHeight: 600,
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
        "/src/simpleScan.ts": {
          code: simpleScan,
        },
        "/src/renderTable.ts": {
          code: renderTable,
        },
        "tsconfig.json": {
          code: tsconfig,
          hidden: true,
        },
        "/index.html": {
          code: indexHtml,
          hidden: true,
        },
      }}
    />
  );
}
