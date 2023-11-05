struct Input { 
    sum: f32,  //! "sum: f32,"=inputStruct 
}

struct Output { 
    sum: f32,  //! "sum: f32,"=outputStruct 
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
fn reduceFromBuffer(
    @builtin(global_invocation_id) grid: vec3<u32>,    // coords in the global compute grid
    @builtin(local_invocation_id) localId: vec3<u32>, // coords inside the this workgroup
    @builtin(num_workgroups) numWorkgroups: vec3<u32>, // number of workgroups in this dispatch
    @builtin(workgroup_id) workgroupId: vec3<u32>      // workgroup id in the dispatch
) {
    reduceBufferToWork(grid.xy, localId.x);
    let outDex = workgroupId.x + u.resultOffset;
    reduceWorkgroupToOut(outDex, localId.x);
}

fn reduceBufferToWork(grid: vec2<u32>, localId: u32) {
    var values = fetchSrcBuffer(grid.x);
    var v = reduceSrcBlock(values);
    work[localId] = v;
}

// LATER benchmark striping/striding could reduce memory bank conflict
// might be useful on other hardware.
//
// Current benchmarks are near the practical limit on memory bandwidth on my m1max 
// theoretical limit is 400gb/sec, practical reports of 330 gb/sec for native apps,
// and we're at 320 gb/sec.
fn fetchSrcBuffer(gridX: u32) -> array<Output, 4> {  //! 4=blockArea
    let start = u.sourceOffset + (gridX * 4u); //! 4=blockArea
    let end = arrayLength(&src);
    var a = array<Output,4>(); //! 4=blockArea
    for (var i = 0u; i < 4u; i = i + 1u) { //! 4=blockArea
        var idx = i + start;
        if idx < end {
            a[i] = loadOp(src[idx]);
        } else {
            a[i] = identityOp();
        }
    }

    return a;
}

fn reduceSrcBlock(a: array<Output, 4>) -> Output { //! 4=blockArea
    var v = a[0];
    for (var i = 1u; i < 4u; i = i + 1u) { //! 4=blockArea
        v = binaryOp(v, a[i]);
    }
    return v;
}

// We write in a pattern like this:
// 0    1    2    3    4    5    6    7  (from reduceBufferToWork for workgroupThreads=8)
// 01        23        45        67     (first iteration of reduceWorkgroupToOut, stride=1
// 0123                4567             (second iteration of reduceWorkgroupToOut, stride=2
// 01234567
// The pattern is constructed to:
// . avoid races within an iteration 
//   (which would require an extra barrier between reads and writes)
// . binary operations always occur in in sequence order (no commutativity required) 
// . a continguous set of lowest thread ids are active (so free high id threads can be rescheduled)
//
fn reduceWorkgroupToOut(outDex: u32, localId: u32) {
    var stride = 1u;
    for (var threads = 4u >> 1u; threads >= 1u; threads >>= 1u) { //! 4=workgroupThreads
        workgroupBarrier();
        if localId < threads {
            let src = localId * 2u * stride;
            work[src] = binaryOp(work[src], work[src + stride]);
        }
        stride <<= 1u;
    }
    if localId == 0u {
        out[outDex] = work[0];
    }
}

fn binaryOp(a: Output, b: Output) -> Output {
    return Output(a.sum + b.sum);  //! "return Output(a.sum + b.sum);"=binaryOp
}

fn loadOp(a: Input) -> Output {
    return Output(a.sum);  //! "return Output(a.sum);"=loadOp
}

fn identityOp() -> Output {
    return Output(0.0); //! "return Output(0.0);"=identityOp
}