import exampleCode from "../../examples/src/simpleScan.ts?raw";
import { StoneberryLive } from "../src/StoneberryLive";
import "live-typescript/style.css";

export function App(): JSX.Element {
  return <StoneberryLive code={exampleCode} />;
}
