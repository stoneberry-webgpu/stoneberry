// Calculate a histogram from a source texture
//
// Only texture values between min and max (inclusive) are counted for the histogram
// . the min/max range is read from a buffer (typically calculated by a previous reduction shader)
//
// two buffers are written as output, 
// . one for the histogram (counts) per bucket
// . one for the sum per bucket
// 
struct Uniforms {
  unused: u32,
}

struct Range {
    min: f32, //! f32=inputElements
    max: f32, //! f32=inputElements 
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var srcTexture: texture_2d<u32>; // source data //! u32=inputElements
@group(0) @binding(2) var<storage, read> maxBuffer: array<Range>; 
@group(0) @binding(3) var<storage, read_write> histogramOut: array<array<u32, 128>>; //! 128=buckets
@group(0) @binding(4) var<storage, read_write> sumOut: array<array<u32, 128>>; //! u32=inputElements 128=buckets
@group(0) @binding(11) var<storage, read_write> debug: array<f32>; // buffer to hold debug values

override workgroupSizeX = 4;      
override workgroupSizeY = 4;      
override numBuckets = 10u;      
const numBucketsFloat= f32(100);  //! 100=buckets 
const maxBucket = i32(100u - 1u);  //! 100=buckets

var <private>valueRange: f32;

// we accumulate bucket totals in workgroup memory and then copy the local buckets to global memory
var<workgroup> localHistogram: array<atomic<u32>, numBuckets>;
var<workgroup> localSum: array<atomic<u32>, numBuckets>;

@compute 
@workgroup_size(workgroupSizeX, workgroupSizeY, 1) 
fn textureToHistograms(
    @builtin(global_invocation_id) grid: vec3<u32>,    // coords in the global compute grid
    @builtin(local_invocation_id) workGrid: vec3<u32>, // coords inside the this workgroup
    @builtin(num_workgroups) numWorkgroups: vec3<u32>, // number of workgroups in this dispatch
    @builtin(workgroup_id) workgroupId: vec3<u32>      // workgroup id in the dispatch
) {
    let minMax = maxBuffer[arrayLength(&maxBuffer) - 1u];
    let minValue = u32(minMax.min); //! u32=inputElements
    let maxValue = u32(minMax.max); //! u32=inputElements
    valueRange = f32(maxValue) - f32(minValue);
    let largeU32 = 1000.0 * 1000.0 * 1000.0; // near to max u32 (4 billion), with some room for overflow
    let toUIntRange: f32 = largeU32 / f32(maxValue);    // conversion factor to convert a density value to a u32 

    collectBlock(grid.xy, minValue, maxValue, toUIntRange);
    workgroupBarrier();

    if workGrid.x == 0u && workGrid.y == 0u {
        let workIndex = workgroupId.x + workgroupId.y * numWorkgroups.x;
        if grid.x == 1u {
            debug[0] = 11.0;
        }
        copyToOuput(toUIntRange, workIndex);
    }
}

// collect histogram for one block into workgroup local array
fn collectBlock(grid: vec2<u32>,
    minValue: u32, //! u32=inputElements
    maxValue: u32, //! u32=inputElements
    toUIntRange: f32) {
    let srcDim = vec2<u32>(
        u32(textureDimensions(srcTexture).x),
        u32(textureDimensions(srcTexture).y)
    );
    var blockStart = vec2<u32>(grid.x * 4u, grid.y * 4u); //! 4=blockWidth 4=blockHeight

    // LATER try striding/striping, should reduce memory bank conflicts
    for (var x = 0u; x < 4u; x++) { //! 4=blockWidth
        for (var y = 0u; y < 4u; y++) { //! 4=blockHeight
            let spot = blockStart + vec2<u32>(x, y);
            if spot.x < srcDim.x && spot.y < srcDim.y {
                collectPixel(spot, minValue, maxValue, toUIntRange);
            }
        }
    }
}

// add one pixel into workgroup local histogram bucket and local sum 
fn collectPixel(spot: vec2<u32>,
    minValue: u32, //! u32=inputElements
    maxValue: u32, //! u32=inputElements
    toUintRange: f32) {
    let texel = textureLoad(srcTexture, vec2<i32>(spot), 0);
    let p = loadOp(texel);
    if p >= minValue {
        let bucket = toBucket(p, minValue, maxValue);
        atomicAdd(&localHistogram[bucket], 1u);
        // p is a float in the range 0 to max 
        // we want to store it as an integer in the range 0 to 2^32-1
        // (only integer values can be stored in atomic variables)
        // so conceptually we multiply by 2^32-1 and divide by max
        // (actually, we use a number that is less than 2^32-1 to avoid overflow)
        atomicAdd(&localSum[bucket], u32(f32(p) * toUintRange)); // TODO avoid this conversion for non-float inputs
    }
}

// return the bucket index for this value
fn toBucket(p: u32,  //! u32=inputElements
    min: u32, //! u32=inputElements
    max: u32) -> i32 { //! u32=inputElements
    var bucket: i32;
    if p >= max {
        bucket = maxBucket; // TODO do we really want to count values > max?
    } else {
        let i = f32(p - min) / valueRange;
        bucket = i32(floor(i * numBucketsFloat));
    }
    return bucket;
}

// copy the workgroup local histogram array to the output buffer
fn copyToOuput(toUIntRange: f32, workIndex: u32) {
    for (var i = 0u; i < numBuckets; i++) {
        histogramOut[workIndex][i] = atomicLoad(&localHistogram[i]);
        let sum = f32(atomicLoad(&localSum[i])) / toUIntRange;
        sumOut[workIndex][i] = u32(sum); //! u32=inputElements
    }
}

fn loadOp(a: vec4<u32>) -> u32 { //! u32=inputElements u32=inputElements 
    return a.r; //! "return a.r;"=loadOp
}
