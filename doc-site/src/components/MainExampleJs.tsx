import { Sandpack } from "@codesandbox/sandpack-react";
import simpleScan from "!!raw-loader!../../../examples/src/simpleScanJs.js?raw";
import renderTable from "!!raw-loader!../../../examples/src/renderTableJs.js?raw";
import indexHtml from "!!raw-loader!../../../examples/index.html?raw";
import React from "react";


/* Hoping to make a javascript example that doesn't use vite and runs faster */
export function MainExampleJs(): JSX.Element {
  return (
    <Sandpack
      template="vite"
      options={{
        editorHeight: 400,
        visibleFiles: ["/src/simpleScan.js"],
        activeFile: "/src/simpleScan.js",
      }}
      customSetup={{
        dependencies: {
          stoneberry: "latest",
          thimbleberry: "latest",
        },
        entry: "/src/simpleScan.js",
      }}
      files={{
        "/src/simpleScan.js": {
          code: simpleScan,
        },
        "/src/renderTable.js": {
          code: renderTable,
        },
        "/index.html": {
          code: indexHtml,
          hidden: true,
        },
      }}
    />
  );
}
