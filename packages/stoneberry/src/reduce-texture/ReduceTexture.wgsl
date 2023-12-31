// #template replacer

// #import reduceWorkgroup(work, Output, workgroupThreads)
// #import binaryOp(Output)
// #import identityOp(Output)
// #import loadTexel(Output)

// #if typecheck
fn reduceWorkgroup(localId: u32) {}
fn binaryOp(a: Output, b: Output) -> Output {}
fn identityOp() -> Output {}
fn loadTexel(a: vec4<f32>) -> Output { return Output(1.0); }
// #endif

struct Output { 
// #import ElemFields
// #if typecheck 
    sum: f32,  
// #endif
}

struct Uniforms {
    resultOffset: u32,        // offset in Output elements to start writing in the results
}

@group(0) @binding(0) var<uniform> u: Uniforms;      
@group(0) @binding(1) var srcTexture: texture_2d<f32>; // source data   // #replace f32=texelType 
@group(0) @binding(2) var<storage, read_write> out: array<Output>;  
@group(0) @binding(11) var<storage, read_write> debug: array<f32>; // buffer to hold debug values

override workgroupThreads = 4; 
override workgroupSizeX = 2; 
override workgroupSizeY = 2; 

var <workgroup> work:array<Output, workgroupThreads>; 

// reduce from the src texture to a workgroup buffer, and then reduce the workgroup buffer to a storage buffer
// (i.e. do the first two reduction levels)
@compute 
@workgroup_size(workgroupSizeX, workgroupSizeY, 1) 
fn main(
    @builtin(global_invocation_id) grid: vec3<u32>,    // coords in the global compute grid, one per block
    @builtin(num_workgroups) numWorkgroups: vec3<u32>, // number of workgroups in this dispatch
    @builtin(workgroup_id) workgroupId: vec3<u32>,     // workgroup id in the dispatch
    @builtin(local_invocation_index) localIndex: u32   // index of this thread in the workgroup
) {
    reduceSrcToWork(grid.xy, localIndex);
    let workIndex = workgroupId.x + workgroupId.y * numWorkgroups.x;
    let outDex = workIndex + u.resultOffset;
    reduceWorkgroup(localIndex);
    if localIndex == 0u {
        out[outDex] = work[0];
    }
}

fn reduceSrcToWork(grid: vec2<u32>, localIndex: u32) {
    let values = fetchSrc(grid.xy);
    work[localIndex] = reduceBlock(values);
}

// fetch a block of data fro the source texture
fn fetchSrc(grid: vec2<u32>) -> array<Output, 4> {              // #replace 4=blockArea
    var outDex = 0u; // output index
    var result = array<Output, 4>();     // #replace 4=blockArea
    let srcWidth = textureDimensions(srcTexture).x;
    let srcHeight = textureDimensions(srcTexture).y;

    for (var ix = 0u; ix < 2u; ix = ix + 1u) {        // #replace 2=blockWidth
        var x = grid.x * 2u + ix;                     // #replace 2=blockWidth
        for (var iy = 0u; iy < 2u; iy = iy + 1u) {    // #replace 2=blockHeight
            var y = grid.y * 2u + iy;                 // #replace 2=blockHeight
            if x >= srcWidth || y >= srcHeight {
                result[outDex] = identityOp();
            } else {
                let srcSpot = vec2(x, y);
                let texel = textureLoad(srcTexture, srcSpot, 0);
                result[outDex] = loadTexel(texel);
            }
            outDex = outDex + 1u;
        }
    }
    return result;
}

// reduce a block of source pixels to a single output structure
fn reduceBlock(a: array<Output, 4>) -> Output {                 // #replace 4=blockArea
    var v = a[0];
    for (var i = 1u; i < 4u; i = i + 1u) {            // #replace 4=blockArea
        v = binaryOp(v, a[i]);
    }
    return v;
}