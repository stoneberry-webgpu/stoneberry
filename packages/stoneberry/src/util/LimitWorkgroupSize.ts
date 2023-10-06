import { Vec2 } from "thimbleberry";

export interface WorkgroupLimits {
  maxComputeWorkgroupSizeX: number;
  maxComputeWorkgroupSizeY: number;
  maxComputeInvocationsPerWorkgroup: number;
}

/** modify a 2D workgroupSize to stay within device limits */
export function limitWorkgroupSize(limits: WorkgroupLimits, proposed: Vec2): Vec2 {
  const threads = proposed[0] * proposed[1];

  // shrink if too many total threads
  const maxThreads = limits.maxComputeInvocationsPerWorkgroup;
  const shinkFactor = threads > maxThreads ? threads / maxThreads : 1;
  const shrunk = proposed.map(size => Math.floor(size / shinkFactor)) as Vec2;

  // shrink further if workgroup axis is too big
  const maxX = limits.maxComputeWorkgroupSizeX;
  const maxY = limits.maxComputeWorkgroupSizeY;
  const size = [maxX, maxY].map((max, i) => Math.min(shrunk[i], max)) as Vec2;

  return size;
}
