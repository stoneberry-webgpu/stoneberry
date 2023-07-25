//// <reference types="rollup-plugin-sourcefiles" />
/** @hidden */
declare module "*?raw" {
  const content: string;
  export default content;
}

/** @hidden */
declare module "!!raw-loader!*" {
  const content: string;
  export default content;
}

/** @hidden */
declare module "*?typeFiles" {
  const content: Record<string, string>;
  export default content;
}

/** @hidden */
declare module "*?remapImports" {
  const content: Record<string, string>;
  export default content;
}

/** @hidden */
declare module "*?sourceFiles" {
  const content: SourceFiles;
  export default content;
}
