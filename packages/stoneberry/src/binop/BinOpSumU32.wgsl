// #module stoneberry.BinOpSumU32


// #if typecheck
struct LoadElem {
    sum:u32
}
// #endif

// #export
struct LoadBinOpElem {
    sum: u32,  
}

// #export 
struct BinOpElem { 
    sum: u32,  
}

// #export(BinOpElem)
fn binaryOp(a: BinOpElem, b: BinOpElem) -> BinOpElem {
    return BinOpElem(a.sum + b.sum);
}

// #export(LoadElem, BinOpElem)
fn loadOp(a: LoadElem) -> BinOpElem {
    return BinOpElem(a.sum);  
}

// #export(BinOpElem)
fn identityOp() -> BinOpElem {
    return BinOpElem(0u);
}
