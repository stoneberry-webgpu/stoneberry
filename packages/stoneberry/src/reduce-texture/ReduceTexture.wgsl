struct Output { 
    sum: f32,  //! "sum: f32,"=outputStruct 
}

struct Uniforms {
    resultOffset: u32,        // offset in Output elements to start writing in the results
}

@group(0) @binding(0) var<uniform> u: Uniforms;                     // uniforms
@group(0) @binding(1) var srcTexture: texture_2d<f32>; //! f32=texelType // source data 
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
fn reduceFromTexture(
    @builtin(global_invocation_id) grid: vec3<u32>,    // coords in the global compute grid, one per block
    @builtin(num_workgroups) numWorkgroups: vec3<u32>, // number of workgroups in this dispatch
    @builtin(workgroup_id) workgroupId: vec3<u32>,     // workgroup id in the dispatch
    @builtin(local_invocation_index) localIndex: u32   // index of this thread in the workgroup
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
fn fetchSrc(grid: vec2<u32>) -> array<Output, 4> { //! 4=blockArea
    var outDex = 0u; // output index
    var result = array<Output, 4>(); //! 4=blockArea
    let srcWidth = textureDimensions(srcTexture).x;
    let srcHeight = textureDimensions(srcTexture).y;

    for (var ix = 0u; ix < 2u; ix = ix + 1u) { //! 2=blockWidth
        var x = i32(grid.x * 2u + ix); //! i32="u32" 2=blockWidth
        for (var iy = 0u; iy < 2u; iy = iy + 1u) { //! 2=blockHeight
            var y = i32(grid.y * 2u + iy); //! i32="u32" 2=blockHeight
            if x >= srcWidth || y >= srcHeight {
                result[outDex] = identityOp();
            } else {
                let srcSpot = vec2<i32>(x, y); //! i32="u32"
                let texel = textureLoad(srcTexture, srcSpot, 0);
                let loaded = loadOp(texel);
                result[outDex] = createOp(loaded);
            }
            outDex = outDex + 1u;
        }
    }
    return result;
}

fn reduceWorkgroupToOut(grid: vec2<u32>, workIndex: u32) {
    var v = work[0];
    for (var i = 1u; i < u32(workgroupThreads); i = i + 1u) {
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

fn createOp(a: f32) -> Output { //! f32=texelType
    return Output(a); //! "return Output(a);"=createOp
}

fn loadOp(a: vec4<f32>) -> f32 { //! f32=texelType f32=texelType
    return a.r; //! "return a.r;"=loadOp
}

fn binaryOp(a: Output, b: Output) -> Output {
    return Output(a.sum + b.sum);  //! "return Output(a.sum + b.sum);"=binaryOp
}

fn identityOp() -> Output {
    return Output(0.0); //! "return Output(0.0);"=identityOp
}
