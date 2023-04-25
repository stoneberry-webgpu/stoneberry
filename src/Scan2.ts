import { ScannerConfig } from "./Scan";

/** Evolving towards a second rev of Scan. Two issues for parameters */

/** Four possible apis for passing/modifying parameters. 
 * Consider how to modify start and end for the created scanner. */
export interface ScannerUpdateApis {
  // 1) option update - pass any modified parameters in an object
  update(partialConfig: Partial<ScannerConfig>): void;

  // 2) option setters - setters for each field, probably getters too
  setStart(s: number): void;
  setEnd(e: number): void;

  // 3) option mutable - mutate fields (interally probably setter functions)
  start?: number;
  end?: number;

  // 4) option pass all - pass all parameter every time
  scan2(config: ScannerConfig): void;

  /*
  Discussion of options for passing/updating parameters:
  'update' 
    * fewer calls in api (but the params struct is just as complicated, so not really smaller)
    - probably a less familiar interface style for users
    - typically less convenient for caller, IDE tab completion not as good, etc.

  'pass all' 
    + nice functional feel, wysiwyg. 
    - caller maintains state, which is duplicative since internally we need to maintain state anyway 
      (e.g. to know if we need to update uniforms, resize internal buffer, etc.)
    - assymetry with composable commands() api
    - multiple optional params is awkward

  'mutable'
    * perhaps switch to new PrefixScan() instead of prefixScan() since classes with mutable fields are familiar?
    - encourages mutable rather than functional thinking

  'setters'
    - seems like c++, java
    + familiar interface to c++/java programmers
    - wordy, why not just use mutable?

  I'm liking option 'mutable' atm.
*/
}

/* 
  For ScannerConfig, we can allow user the option of passing parameters as 
  functions returning a primitive value in addition to parameters as a primitive value. 
  Passing a function leads to better separation of concerns between creation and execution.

  Here's a partial example: 
*/
export interface ScannerConfig2 {
  /** source data to be scanned */
  src: GPUBuffer | (() => GPUBuffer);

  /** start index in src buffer of range to scan  (0 if undefined) */
  start?: number | (() => number);

  /* 
  If a fn is provided, the Scanner will call the fn to get the value before each call to scan() or commands().
    + allows user to declare a link to an upstream shader e.g. their output is our input
      . If the upstream changes to a new output, user doesn't have to manually update the parameters.
      + leads to better separation of concerns
    * laziness may help for initialization sequencing, e.g. maybe srcBuffer isn't decided yet.
*/
}
