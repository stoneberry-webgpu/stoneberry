var <workgroup> work:array<Elem, 18>; 
struct Elem { sum: u32; }
fn binaryOp(a: Elem, b: Elem) -> Elem {}

// #template replacer

// #export(work, Elem, threads) 
fn reduceWorkgroup(localId: u32) {
    let workDex = localId << 1u;
    for (var step = 1u; step < 4u; step <<= 1u) { // #replace 4=threads
        workgroupBarrier();
        if localId % step == 0u {
            work[workDex] = binaryOp(work[workDex], work[workDex + step]);
        }
    }
}

// #import binaryOp(Elem)
