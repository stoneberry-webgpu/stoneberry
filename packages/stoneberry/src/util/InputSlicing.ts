export interface SlicingResults {
  /** partitions of the input and corresponding part of the uniforms buffer */
  slices: InputSlice[];

  /** total size of the uniform buffer in bytes */
  uniformsBufferSize: number;

  /** size of each slice of the uniform buffer */
  uniformsSliceSize: number;
}

export type InputSlice = DispatchSlice & UniformSlice;

interface DispatchSlice {
  /** number of dispatches to cover this slice (typically 65K, until the last slice) */
  dispatch: number;

  /** offset in elems to the start of the this slice in the source */
  offset: number;
}

interface UniformSlice {
  /** offset in in bytes to the start of the this slice in uniforms */
  uniformOffset: number;
}

export interface InputSlicingArgs {
  /** number of source elements  */
  elems: number;

  /** elements processed per dispatch (e.g. workgroupSize * elems processed/workgroup) */
  elemsPerDispatch: number;

  /** max workgroups per dispatch (typically 64K)  */
  maxDispatches: number;

  /** size in bytes of uniforms for one dispatch */
  baseUniformSize: number;

  /** required alignment of uniform slices (256) */
  uniformAlignSize: number;
}

/** To handle large input sizes, we need to issue multiple dispatches
 *  since each dispatch is limited to 65K workgroups.
 *
 * So we partition the input into slices, and size a partioned uniform
 * buffer that can be indexed with dynamicOffsets.
 *
 *  @return array of slices
 */
export function inputSlicing(args: InputSlicingArgs): SlicingResults {
  const { elems, elemsPerDispatch, maxDispatches } = args;
  const { baseUniformSize, uniformAlignSize } = args;
  const dispatchSlices = dispatchSlicing(elems, elemsPerDispatch, maxDispatches);
  const numSlices = dispatchSlices.length;
  const uniformsSizing = slicedUniformsSizing(numSlices, baseUniformSize, uniformAlignSize);
  const { sliceSize, bufferSize } = uniformsSizing;

  const slices: InputSlice[] = dispatchSlices.map((dispatchSlice, i) => {
    const uniformOffset = i * sliceSize;
    return { ...dispatchSlice, uniformOffset };
  });

  return {
    slices,
    uniformsBufferSize: bufferSize,
    uniformsSliceSize: sliceSize,
  };
}

/** To handle large input sizes, we need to issue multiple dispatches
 *  since each dispatch is limited to 65K workgroups.
 *
 * Here we partition the input into slices.
 *
 *  @return array of slices
 */
function dispatchSlicing(
  elems: number,
  elemsPerDispatch: number,
  maxDispatches: number
): DispatchSlice[] {
  const slices: DispatchSlice[] = [];

  let toDispatch = Math.ceil(elems / elemsPerDispatch);
  let offset = 0;

  while (toDispatch > 0) {
    const dispatch = Math.min(toDispatch, maxDispatches);
    slices.push({ dispatch, offset });
    toDispatch -= dispatch;
    offset += dispatch * elemsPerDispatch;
  }

  return slices;
}

interface UniformsSizing {
  bufferSize: number;
  sliceSize: number;
}

/**
 * Calculate the size of a sliced uniform buffer for large sliced inputs.
 * The dispatch will typically use dynamic offsets with each dispatch using a different
 * offset into a single uniform buffer.
 *
 * (In an input sliced scenario, we need a different set of uniforms for each slice
 * so that the wgsl for each slice can use different offsets into its input and output buffers.)
 *
 * @return the size of the uniform buffer needed for the given number of slices
 */
function slicedUniformsSizing(
  /** number of slices */
  numSlices: number,
  /** size of the uniforms w/o duplicatioh */
  baseSize: number,
  /** required alignment of uniforms buffer dynamic offsets (typically 256 bytes) */
  alignSize: number
): UniformsSizing {
  if (numSlices < 2) {
    return { bufferSize: baseSize, sliceSize: baseSize};
  }
  const minSize = Math.max(baseSize, alignSize);
  const sliceSize = Math.ceil(minSize / alignSize) * alignSize;
  const bufferSize = numSlices * sliceSize;
  return { bufferSize, sliceSize };
}
