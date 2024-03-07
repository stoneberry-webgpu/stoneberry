import { mapN } from "thimbleberry";
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
  function loadTexel(fnName: string, params: Record<string, string>): string {
    const { Output: output, texelType = "texelType" } = params;
    let result: string;
    if (output) {
      const args = mapN(elemParamCount, () => `a.${component}`).join(", ");
      result = `fn loadTexel(a: vec4<${texelType}>) -> ${output} { 
        return ${output}(${args});
      }`;
    } else {
      // TODO unused, we always set output
      result = `fn loadTexel(a: vec4<${texelType}>) -> ${texelType} { 
        return a.${component};
      }`;
    }
    return result;
  }
  return { kind: "function", fn: loadTexel };
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
