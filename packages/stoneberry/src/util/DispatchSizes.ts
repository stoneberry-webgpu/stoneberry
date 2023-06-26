/** @return a sequence of dispatches sizes large enough to cover all
 * of the source elements, without exceeding the maximum dispatch size */
export function calcDispatchSizes(
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
