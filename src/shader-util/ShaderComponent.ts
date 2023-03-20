/** An interface for modular shaders */
export interface ShaderComponent {
  /** add gpu passes and gpu commands to the shared gpu execution queue for the current frame */
  encodeCommands(encoder: GPUCommandEncoder): void;

  /** std interface to pass flags to control logging  */
  debugLogging?: (debugFlags: Record<string, unknown>) => void;

  /** cleanup unused gpu resources */
  destroy?: () => void;
}
