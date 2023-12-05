import { CodeGenFn } from "wgsl-linker";

export type LoadComponent = LoadTemplate | LoadCodeGen;

/** wgsl template for loading a value from a wgsl vec4 */
export interface LoadTemplate {
  kind: "template";
  wgsl: string;
}

export interface LoadCodeGen {
  kind: "function";
  fn: CodeGenFn;
}

export type ComponentName = "r" | "g" | "b" | "a";

export function loadTexelCodeGen(component: ComponentName): LoadCodeGen {
  const loadTexel = (params: { Output: string }): string => {
    const output = params.Output || "Output";
    return `fn loadTexel(a: vec4<f32>) -> ${output} {
      return ${output}(a.${component});
    }`;
  };
  return { kind: "function", fn: loadTexel as CodeGenFn };
}
