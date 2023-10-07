import exampleCode from "../../examples/src/reduceBufferExample.ts?raw";
import { StoneberryLive } from "../src/StoneberryLive";
import "live-typescript/style.css";
import "../../doc-site/src/css/custom.css";

export function App(): JSX.Element {
  return <StoneberryLive code={exampleCode} />;
}
