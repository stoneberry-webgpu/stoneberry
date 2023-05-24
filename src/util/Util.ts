// TODO  these are similar to thimbleberry. harmonize and re-export from thimbleberry

export type ValueOrFn<T> = T | (() => T);

/**
 * Core api for shaders that can be run in a group.
 */
export interface ComposableShader {
  /** Add compute or render passes for this shader to the provided GPUCommandEncoder */
  commands(encoder: GPUCommandEncoder): void;
}

/** API for pluggable cache */
export interface Cache<V extends object> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
}
