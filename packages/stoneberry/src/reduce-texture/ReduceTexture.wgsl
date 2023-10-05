struct Output { 
    sum: f32,  //! "sum: f32,"=outputStruct 
}

struct Uniforms {
    resultOffset: u32,        // offset in Output elements to start writing in the results
}

@group(0) @binding(0) var<uniform> u: Uniforms;                     // uniforms
@group(0) @binding(1) var srcTexture: texture_2d<f32>; // source data
@group(0) @binding(2) var<storage, read_write> out: array<Output>;  
@group(0) @binding(11) var<storage, read_write> debug: array<f32>; // buffer to hold debug values

let workgroupThreads= 4; //! let="const" 4=workgroupThreads
let workgroupSizeX = 2; //! let="const" 2=workgroupSizeX
let workgroupSizeY = 2; //! let="const" 2=workgroupSizeY

var <workgroup> work:array<Output, workgroupThreads>; 

// reduce from the src texture to a workgroup buffer, and then reduce the workgroup buffer to a storage buffer
// (i.e. do the first two reduction levels)
@compute 
@workgroup_size(workgroupSizeX, workgroupSizeY, 1) 
fn reduceFromTexture(
    @builtin(global_invocation_id) grid: vec3<u32>,    // coords in the global compute grid, one per block
    // @builtin(local_invocation_id) localGrid: vec3<u32>, // coords inside the this workgroup, one per block
    @builtin(num_workgroups) numWorkgroups: vec3<u32>, // number of workgroups in this dispatch
    @builtin(workgroup_id) workgroupId: vec3<u32>,     // workgroup id in the dispatch
    @builtin(local_invocation_index) localIndex: u32 // index of this thread in the workgroup
) {
    reduceSrcToWork(grid.xy, localIndex);
    workgroupBarrier();
    if localIndex == 0u {
        let workIndex = workgroupId.x + workgroupId.y * numWorkgroups.x;
        reduceWorkgroupToOut(grid.xy, workIndex);
    }
}

fn reduceSrcToWork(grid: vec2<u32>, localIndex: u32) {
    let values = fetchSrc(grid.xy);
    work[localIndex] = reduceBlock(values);
}

// LATER try striping/striding to reduce memory bank conflicts
// LATER try blocks that are e.g. 4x1
fn fetchSrc(grid: vec2<u32>) -> array<Output, 4> { //! 4=blockArea
    var i = 0u;
    var result = array<Output, 4>(); //! 4=blockArea
    let srcWidth = textureDimensions(srcTexture).x;
    let srcHeight = textureDimensions(srcTexture).y; 
    // the compute grid is half the size of the src image in both dimensions if blockLength=2
    for (var x = 0u; x < 2u; x = x + 1u) { //! 2=blockLength
        var u = i32(grid.x * 2u + x); //! i32="u32" 2=blockLength 
        for (var y = 0u; y < 2u; y = y + 1u) {//! 2=blockLength
            var v = i32(grid.y * 2u + y); //! i32="u32" 2=blockLength 
            if u >= srcWidth || v >= srcHeight {
                result[i] = identityOp();
            } else {
                let texel = textureLoad(srcTexture, vec2<i32>(u, v), 0); //! i32="u32"
                let loaded = loadOp(texel);
                result[i] = createOp(loaded);
            }
            i = i + 1u;
        }
    }
    return result;
}

fn reduceWorkgroupToOut(grid: vec2<u32>, workIndex: u32) {
    var v = work[0];
    for (var i = 1u; i < 4u; i = i + 1u) { //! 4=workgroupThreads
        v = binaryOp(v, work[i]);
    }
    out[workIndex] = v;
}

// reduce a block of source pixels to a single output structure
fn reduceBlock(a: array<Output, 4>) -> Output { //! 4=blockArea
    var v = a[0];
    for (var i = 1u; i < 4u; i = i + 1u) { //! 4=blockArea
        v = binaryOp(v, a[i]);
    }
    return v;
}

fn createOp(a: f32) -> Output {
    return Output(a); //! "return Output(a);"=createOp
}

fn loadOp(a: vec4<f32>) -> f32 {
    return a.r; //! "return a.r;"=loadOp
}

fn binaryOp(a: Output, b: Output) -> Output {
    return Output(a.sum + b.sum);  //! "return Output(a.sum + b.sum);"=binaryOp
}

fn identityOp() -> Output {
    return Output(0.0); //! "return Output(0.0);"=identityOp
}
