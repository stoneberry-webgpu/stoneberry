import { Sandpack } from "@codesandbox/sandpack-react";
import exampleUtils from "!!raw-loader!../../../examples/src/exampleUtils.ts?raw";
import tsconfig from "!!raw-loader!../../../examples/tsconfig.json?raw";
import indexHtml from "!!raw-loader!../examples/index.html?raw";

import React from "react";

export interface ExampleProps {
  code : string;
}

export function ExampleCode(props: ExampleProps): JSX.Element {
  const { code } = props;
  return (
    <Sandpack
      template="vite"
      options={{
        editorHeight: 400,
        editorWidthPercentage: 60,
        visibleFiles: ["/src/example.ts"],
        activeFile: "/src/example.ts",
      }}
      customSetup={{
        dependencies: {
          stoneberry: "latest",
          thimbleberry: "latest",
        },
        entry: "/src/example.ts",
      }}
      files={{
        "/src/example.ts": code,
        "/src/exampleUtils.ts": exampleUtils,
        "tsconfig.json": tsconfig,
        "/index.html": indexHtml,
      }}
    />
  );
}
