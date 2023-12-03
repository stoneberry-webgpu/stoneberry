import { CodeGenFn } from "wgsl-linker";

/** wgsl template for loading a value from a wgsl vec4 */
export interface LoadTemplate {
  wgsl: CodeGenFn | string;
}

export type LoadableComponent = "r" | "g" | "b" | "a";

export function loadTexelCodeGen(component: LoadableComponent): CodeGenFn {
  const f = (params: { Output: string }): string => {
    const output = params.Output || "Output";
    return `fn loadTexel(a: vec4<f32>) -> ${output} {
      return ${output}(a.${component});
    }`;
  };
  return f as CodeGenFn;
}
