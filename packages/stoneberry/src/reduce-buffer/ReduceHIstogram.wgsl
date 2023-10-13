
struct Input { 
   histogram: array<u32, 8>, 
}

struct Output { 
   histogram: array<u32, 8>, 
}


struct Uniforms {
    sourceOffset: u32,        // offset in Input elements to start reading in the source
    resultOffset: u32,        // offset in Output elements to start writing in the results
}

@group(0) @binding(0) var<uniform> u: Uniforms;                     // uniforms
@group(0) @binding(1) var<storage, read> src: array<Input>; 
@group(0) @binding(2) var<storage, read_write> out: array<Output>;  
@group(0) @binding(11) var<storage, read_write> debug: array<f32>; // buffer to hold debug values


const workgroupThreads= 4; //! 4=workgroupThreads

var <workgroup> work:array<Output, workgroupThreads>; 

// 
// reduce a buffer of values to a single value, returned as the last element of the out array
// 
// each dispatch does two reductions:
//    . each invocation reduces from a src buffer to the workgroup buffer
//    . one invocation per workgroup reduces from the workgroup buffer to the out buffer
// the driver issues multiple dispatches until the output is 1 element long
//    (subsequent passes uses the output of the previous pass as the src)
// the same output buffer can be used as input and output in subsequent passes
//    . start and end indices in the uniforms indicate input and output positions in the buffer
// 

@compute
@workgroup_size(workgroupThreads, 1, 1) 
fn reduceHistogramBuffer(
    @builtin(global_invocation_id) grid: vec3<u32>,    // coords in the global compute grid
    @builtin(local_invocation_id) workGrid: vec3<u32>, // coords inside the this workgroup
    @builtin(num_workgroups) numWorkgroups: vec3<u32>, // number of workgroups in this dispatch
    @builtin(workgroup_id) workgroupId: vec3<u32>      // workgroup id in the dispatch
) {
    reduceBufferToWork(grid.xy, workGrid.xy);
    workgroupBarrier();
    if workGrid.x == 0u && workGrid.y == 0u {
        let workIndex = workgroupId.x + workgroupId.y * numWorkgroups.x;
        reduceWorkgroupToOut(grid.xy, workIndex);
    }
}

fn reduceBufferToWork(grid: vec2<u32>, workGrid: vec2<u32>) {
    var values = fetchSrcBuffer(grid.x);
    var v = reduceBlock(values);
    work[workGrid.x] = v;
}

fn fetchSrcBuffer(gridX: u32) -> array<Output, 4> {
    let start = (gridX * 4u);
    let end = arrayLength(&src);
    var a = array<Output,4>();
    for (var i = 0u; i < 4u; i = i + 1u) {
        var idx = i + start;
        if idx < end {
            a[i] = loadOp(src[idx]);
        } else {
            a[i] = identityOp();
        }
    }

    return a;
}

fn reduceWorkgroupToOut(grid: vec2<u32>, workIndex: u32) {
    var v = work[0];
    for (var i = 1u; i < 4u; i = i + 1u) {
        v = binaryOp(v, work[i]);
    }
    out[workIndex] = v;
}

fn reduceBlock(a: array<Output, 4>) -> Output {
    var v = a[0];
    for (var i = 1u; i < 4u; i = i + 1u) {
        v = binaryOp(v, a[i]);
    }
    return v;
}

fn binaryOp(a: Output, b: Output) -> Output {
    var result: array<u32,8>;
    for (var i = 0u; i < 8u; i = i + 1u) {
        result[i] = a.histogram[i] + b.histogram[i];
    }
    return Output(result);
}

fn loadOp(a: Input) -> Output {
    return Output(a.histogram);
}

fn identityOp() -> Output {
    return Output(array<u32,8>());
}