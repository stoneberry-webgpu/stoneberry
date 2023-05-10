/** string filling template for patching up the wgsl for this type of scan */
export interface ScanTemplate {
  binaryOp: string; // combine two elements, e.g. sum. aka flatMap, join
  identityOp: string; // return identity element, e.g. zero.  // TODO make dynamic
  loadOp: string; // load an element from the source buffer
}

/** publish some standard templates */
export const sumU32: ScanTemplate = {
  binaryOp: "return Output(a.sum + b.sum);",
  identityOp: "return Output(0);",
  loadOp: "return Output(a.sum);"
}

export const sumF32: ScanTemplate = null as any;