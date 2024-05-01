// #module stoneberry.ReduceWorkgroup

// #if typecheck
var <workgroup> work:array<Elem, 18>; 
struct Elem { sum: u32, }
fn binaryOp(a: Elem, b: Elem) -> Elem {}
const <private> threads = 10u;
// #endif

// #export(work, Elem, threads) importing binaryOp(Elem)
fn reduceWorkgroup(localId: u32) {
    let workDex = localId << 1u;
    for (var step = 1u; step < threads; step <<= 1u) {
        workgroupBarrier();
        if localId % step == 0u {
            work[workDex] = binaryOp(work[workDex], work[workDex + step]);
        }
    }
}

