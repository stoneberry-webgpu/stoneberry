import exampleCode from "/node_modules/stoneberry-examples/src/simpleScan.ts?raw";
import { StoneberryLive } from "../src/StoneberryExample";
import "live-typescript/style.css";

export function App(): JSX.Element {
  return <StoneberryLive code={exampleCode} />;
}
