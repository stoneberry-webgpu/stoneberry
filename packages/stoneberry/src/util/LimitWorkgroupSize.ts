import { Vec2 } from "thimbleberry";

export interface WorkgroupLimits {
  maxComputeWorkgroupSizeX: number;
  maxComputeWorkgroupSizeY: number;
  maxComputeInvocationsPerWorkgroup: number;
}

/** modify a 2D workgroupSize to stay within device limits */
export function limitWorkgroupSize(limits: WorkgroupLimits, proposed: Vec2): Vec2 {
  const {
    maxComputeInvocationsPerWorkgroup: maxThreads,
    maxComputeWorkgroupSizeX,
    maxComputeWorkgroupSizeY,
  } = limits;
  const maxXY = [maxComputeWorkgroupSizeX, maxComputeWorkgroupSizeY];


  // shrink if too many total threads
  const threads = proposed[0] * proposed[1];
  const shinkFactor = threads > maxThreads ? Math.sqrt(threads / maxThreads) : 1;
  const shrunk = proposed.map(size => Math.floor(size / shinkFactor)) as Vec2;

  // shrink further if workgroup axis is too big
  const size = maxXY.map((max, i) => Math.min(shrunk[i], max)) as Vec2;

  return size;
}

export function maxWorkgroupSize(limits: WorkgroupLimits): Vec2 {
  const proposed: Vec2 = [
    limits.maxComputeWorkgroupSizeX,
    limits.maxComputeWorkgroupSizeY,
  ];
  return limitWorkgroupSize(limits, proposed);
}
