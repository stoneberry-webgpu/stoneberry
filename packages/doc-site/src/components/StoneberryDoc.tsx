import React from "react";
import { StoneberryLiveProps, StoneberryLive } from "stoneberry-live";
import BrowserOnly from "@docusaurus/BrowserOnly";

/** live documentation for stoneberry, configured for Docusaurus */
export function StoneberryDoc(props: StoneberryLiveProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => {
        return <StoneberryLive {...props}> </StoneberryLive>;
      }}
    </BrowserOnly>
  );
}
