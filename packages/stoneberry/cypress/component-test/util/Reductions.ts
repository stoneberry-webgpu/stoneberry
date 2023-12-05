import { Vec2 } from "thimbleberry";

/* calculating expected results for reduction tests */

export function sumReds(data: number[][][]): number {
  const reds = data.flatMap(row => row.map(col => col[0]));
  return reds.reduce((a, b) => a + b);
}

export function minMaxReds(data: number[][][]): Vec2 {
  const reds = data.flatMap(row => row.map(col => col[0]));
  const min = reds.reduce((a, b) => Math.min(a, b), 1e38);
  const max = reds.reduce((a, b) => Math.max(a, b));
  return [min, max];
}
