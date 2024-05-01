// #module stoneberry.HistogramTexture

// Calculate a histogram from a source texture
//
// Only texture values between min and max (inclusive) are counted for the histogram
// . the min/max range is read from a buffer (typically calculated by a previous reduction shader)
//
// two buffers are written as output, 
// . one for the histogram (counts) per bucket
// . one for the sum per bucket
// 
// #template simple

// #import loadTexel(texelType, texelType)

// #if typecheck
fn loadTexel(a: vec4<u32>) -> u32 { return a.r; }
alias texelType = u32;
const buckets = 100u;
const blockWidth = 4u;
const blockHeight= 4u;
fn texelType(a:u32) { return a; }
// #endif

struct Uniforms {
  unused: u32,
}

struct Range {
    min: texelType, 
    max: texelType, 
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var srcTexture: texture_2d<texelType>; // source data 
@group(0) @binding(2) var<storage, read> maxBuffer: array<Range>; 
@group(0) @binding(3) var<storage, read_write> histogramOut: array<array<u32, buckets>>; 
// #if bucketSums
@group(0) @binding(4) var<storage, read_write> sumOut: array<array<texelType, buckets>>; 
// #endif
@group(0) @binding(11) var<storage, read_write> debug: array<f32>; // buffer to hold debug values

override workgroupSizeX = 4;      
override workgroupSizeY = 4;      
override numBuckets = 10u;      
const numBucketsFloat= f32(buckets);  
const maxBucket = i32(buckets - 1u);  

var <private>valueRange: f32;
var <private>toUIntRange: f32 = 1.0;

// we accumulate bucket totals in workgroup memory and then copy the local buckets to global memory
var<workgroup> localHistogram: array<atomic<u32>, numBuckets>;
// #if bucketSums
var<workgroup> localSum: array<atomic<texelType>, numBuckets>; 
// #endif

@compute 
@workgroup_size(workgroupSizeX, workgroupSizeY, 1) 
fn main(
    @builtin(global_invocation_id) grid: vec3<u32>,    // coords in the global compute grid
    @builtin(local_invocation_id) workGrid: vec3<u32>, // coords inside the this workgroup
    @builtin(num_workgroups) numWorkgroups: vec3<u32>, // number of workgroups in this dispatch
    @builtin(workgroup_id) workgroupId: vec3<u32>      // workgroup id in the dispatch
) {
    let minMax = maxBuffer[arrayLength(&maxBuffer) - 1u];
    let minValue = texelType(i32(minMax.min));  // (useless i32 cast for wgsl-analyzer)
    let maxValue = texelType(i32(minMax.max)); 
    valueRange = f32(maxValue) - f32(minValue);
// #if floatElements
    let largeU32 = 1000.0 * 1000.0 * 1000.0; // near to max u32 (4 billion), with some room for overflow 
    toUIntRange = largeU32 / f32(maxValue);    // conversion factor to convert a density value to a u32 
//#endif

    collectBlock(grid.xy, minValue, maxValue);
    workgroupBarrier();

    if workGrid.x == 0u && workGrid.y == 0u {
        let workIndex = workgroupId.x + workgroupId.y * numWorkgroups.x;
        copyToOuput(workIndex);
    }
}

// collect histogram for one block into workgroup local array
fn collectBlock(grid: vec2<u32>,
    minValue: texelType, // 
    maxValue: texelType) { 
    let srcDim = vec2<u32>(
        textureDimensions(srcTexture).x,
        textureDimensions(srcTexture).y
    );
    var blockStart = vec2<u32>(grid.x * blockWidth, grid.y * blockHeight); 

    // LATER try striding/striping, should reduce memory bank conflicts
    for (var x = 0u; x < blockWidth; x++) { 
        for (var y = 0u; y < blockHeight; y++) { 
            let spot = blockStart + vec2<u32>(x, y);
            if spot.x < srcDim.x && spot.y < srcDim.y {
                collectPixel(spot, minValue, maxValue);
            }
        }
    }
}

// add one pixel into workgroup local histogram bucket and local sum 
fn collectPixel(spot: vec2<u32>,
    minValue: texelType, 
    maxValue: texelType) { 
    let texel = textureLoad(srcTexture, vec2<i32>(spot), 0);
    let p = loadTexel(texel);
    if p >= minValue && checkMax(p, maxValue) {
        let bucket = toBucket(p, minValue, maxValue);
        atomicAdd(&localHistogram[bucket], 1u);
        // p is a float in the range 0 to max 
        // we want to store it as an integer in the range 0 to 2^32-1
        // (only integer values can be stored in atomic variables)
        // so conceptually we multiply by 2^32-1 and divide by max
        // (actually, we use a number that is less than 2^32-1 to avoid overflow)
// #if bucketSums
// #if floatElements
        atomicAdd(&localSum[bucket], u32(f32(p) * toUIntRange)); 
// #else
        atomicAdd(&localSum[bucket], p); 
// #endif
// #endif
    }
}

fn checkMax(p: texelType, max: texelType) -> bool { 
// #if !saturateMax
    if p > max {
        return false;
    }
// #endif
    return true;
}

// return the bucket index for this value
fn toBucket(p: texelType, min: texelType, max: texelType) -> i32 { 
    var bucket: i32;
    if p >= max {
        bucket = maxBucket;
    } else {
        let i = f32(p - min) / valueRange;
        bucket = i32(floor(i * numBucketsFloat));
    }
    return bucket;
}

// copy the workgroup local histogram array to the output buffer
fn copyToOuput(workIndex: u32) { 
    for (var i = 0u; i < numBuckets; i++) {
        histogramOut[workIndex][i] = atomicLoad(&localHistogram[i]);

// #if bucketSums
//   #if floatElements
        let sum = f32(atomicLoad(&localSum[i])) / toUIntRange; 
//   #else
        let sum = f32(atomicLoad(&localSum[i])); 
//   #endif
        sumOut[workIndex][i] = u32(sum); 
// #endif

    }
}
