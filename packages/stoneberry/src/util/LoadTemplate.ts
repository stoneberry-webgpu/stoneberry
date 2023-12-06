import { GPUElementFormat, mapN } from "thimbleberry";
import { CodeGenFn } from "wgsl-linker";

/** code or template to load a value from vec4 */
export type LoadComponent = LoadTemplate | LoadCodeGen;

/** wgsl template for loading a value from a wgsl vec4 */
export interface LoadTemplate {
  kind: "template";
  wgsl: string;
}

/** code gen function to generate wgsl for loading a value from a wgsl vec4 */
export interface LoadCodeGen {
  kind: "function";
  fn: CodeGenFn;
}

export type ComponentName = "r" | "g" | "b" | "a";

/**
 * A function to generate wgsl to load a value from a texture.
 * The importing wgsl should define "Elem" defining the expected result type,
 * and "texelType" defining the type of the input texture (e.g. "f32").
 */
export function loadTexelCodeGen(
  component: ComponentName,
  elemParamCount = 1
): LoadCodeGen {
  const loadTexel = (params: { Output: string; texelType: GPUElementFormat }): string => {
    const { Output: output = "Elem", texelType = "texelType" } = params;
    const args = mapN(elemParamCount, () => `a.${component}`).join(", ");
    return `fn loadTexel(a: vec4<${texelType}>) -> ${output} { 
      return ${output}(${args});
    }`;
  };
  return { kind: "function", fn: loadTexel as CodeGenFn };
}

export function texelLoader(
  texelComponent: ComponentName | LoadComponent
): LoadComponent {
  if (typeof texelComponent === "string") {
    return loadTexelCodeGen(texelComponent);
  } else {
    return texelComponent;
  }
}
