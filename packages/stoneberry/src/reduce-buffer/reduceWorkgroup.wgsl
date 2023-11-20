// placeholder for typechecking, not exported to output, expected to be defined by caller
var <workgroup> work:array<Elem, workgroupThreads>; 

// #export reduce-workgroup(work, Elem, threads) 

// #importReplace binaryOp(Elem)
struct Elem { }
fn binaryOp(a: Elem, b: Elem) -> Elem {}
// #importEnd

fn reduceWorkgroup(localId: u32) {
    let workDex = localId << 1u;
    for (var step = 1u; step < 4u; step <<= 1u) { //#replace 4=threads
        workgroupBarrier();
        if localId % step == 0u {
            work[workDex] = binaryOp(work[workDex], work[workDex + step]);
        }
    }
}
