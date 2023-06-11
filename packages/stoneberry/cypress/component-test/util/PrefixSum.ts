export function inclusiveSum(src: number[]): number[] {
  let prev = 0;

  return src.map(a => {
    const result = a + prev;
    prev = result;
    return result;
  });
}

export function exclusiveSum(src: number[], initialValue: number): number[] {
  const sums = inclusiveSum(src.slice(0, -1));
  return [initialValue, ...sums];
}
