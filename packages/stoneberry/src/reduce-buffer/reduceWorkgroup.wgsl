// #module stoneberry.ReduceWorkgroup

// #if typecheck
var <workgroup> work:array<Elem, 18>; 
struct Elem { sum: u32, }
fn binaryOp(a: Elem, b: Elem) -> Elem {}
// #endif

// #template replace

// #export(work, Elem, threads) importing binaryOp(Elem)
fn reduceWorkgroup(localId: u32) {
    let workDex = localId << 1u;
    for (var step = 1u; step < 4u; step <<= 1u) { // #replace 4=threads
        workgroupBarrier();
        if localId % step == 0u {
            work[workDex] = binaryOp(work[workDex], work[workDex + step]);
        }
    }
}

