// placeholder for typechecking
var <workgroup> work:array<Elem, 18>; 

// #template thimb2

// #export(work, Elem, threads) 
fn reduceWorkgroup(localId: u32) {
    let workDex = localId << 1u;
    for (var step = 1u; step < 4u; step <<= 1u) { //! 4=threads
        workgroupBarrier();
        if localId % step == 0u {
            work[workDex] = binaryOp(work[workDex], work[workDex + step]);
        }
    }
}

// #import binaryOp(Elem)

// #if typecheck
struct Elem { sum: u32; }
fn binaryOp(a: Elem, b: Elem) -> Elem {}
// #endif
