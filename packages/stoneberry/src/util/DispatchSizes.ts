/** return dispatches to cover the source elements */
export function calcDispatchSizes(
  device: GPUDevice,
  elems: number,
  workgroupLength: number,
  maxWorkgroups: number
): number[] {
  const dispatches = [];
  let toDispatch = Math.ceil(elems / workgroupLength);

  while (toDispatch > 0) {
    const size = Math.min(toDispatch, maxWorkgroups);
    dispatches.push(size);
    toDispatch -= size;
  }

  return dispatches;
}
