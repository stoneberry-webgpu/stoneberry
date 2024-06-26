import { mapN } from "thimbleberry";
import { CodeGenFn, ModuleRegistry, RegisterGenerator } from "wgsl-linker";

/** code generator or template to create wgsl that load a value from vec4 */
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
 * A function to generate wgsl to load a value from a texel.
 * @param component - the component to load from the texture e.g. "r" or "a"
 * @param outputParams - the number of elements in the output struct
 * The wgsl importer should pass two paramaters:
 *  . "output" defining the output type e.g. f32
 *  . "texelType" defining the type of the input texture (e.g. "f32").
 */
export function loadTexelCodeGen(
  component: ComponentName,
  outputParams = 1,
): LoadCodeGen {
  function loadTexel(fnName: string, params: Record<string, string>): string {
    const { output, texelType } = params;
    const args = mapN(outputParams, () => `a.${component}`).join(", ");
    const result = `fn ${fnName}(a: vec4<${texelType}>) -> ${output} { 
        return ${output}(${args});
      }`;

    // dlog({ result });
    return result;
  }
  return { kind: "function", fn: loadTexel };
}

/**
 * @return a function or template to generate wgsl to load a value from a texel
 *
 * @param texelComponent - the component name to load from the texture e.g. "r" or "a",
 *  (or an already defined generator function or wgsl template which is just passed through)
 */
export function texelLoader(
  texelComponent: ComponentName | LoadComponent,
): LoadComponent {
  if (typeof texelComponent === "string") {
    return loadTexelCodeGen(texelComponent);
  } else {
    return texelComponent;
  }
}

function texelGenerator(generate: CodeGenFn): RegisterGenerator {
  return {
    name: "loadTexel",
    moduleName: "stoneberry.loadTexel",
    generate,
    args: ["output", "texelType"],
  };
}

export function registerTexelLoader(
  texelComponent: ComponentName | LoadComponent,
  registry: ModuleRegistry,
): void {
  // dlog({ texelComponent });
  if (typeof texelComponent === "string") {
    const ll = loadTexelCodeGen(texelComponent);
    const generator = texelGenerator(ll.fn);
    registry.registerGenerator(generator);
  } else if (texelComponent.kind === "template") {
    registry.addModuleSrc(texelComponent.wgsl);
  } else if (texelComponent.kind === "function") {
    const generator = texelGenerator(texelComponent.fn);
    registry.registerGenerator(generator);
  }
}
