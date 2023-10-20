import React from "react";
import { StoneberryLive, LiveTypescriptProps } from "stoneberry-live";
import BrowserOnly from "@docusaurus/BrowserOnly";

/** live documentation for stoneberry, configured for Docusaurus */
export function StoneberryDoc(props: LiveTypescriptProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => {
        return <StoneberryLive {...props}> </StoneberryLive>;
      }}
    </BrowserOnly>
  );
}
