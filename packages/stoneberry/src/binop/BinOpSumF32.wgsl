// #export 
struct LoadBinOpElem {
    sum: f32,  
}

// #export 
struct BinOpElem { 
    sum: f32,  
}

// #export(BinOpElem)
fn binaryOp(a: BinOpElem, b: BinOpElem) -> BinOpElem {
    return BinOpElem(a.sum + b.sum);
}

// #if typecheck
struct LoadElem {
    sum:f32
}
// #endif

// #export(LoadElem, BinOpElem)
fn loadOp(a: LoadElem) -> BinOpElem {
    return BinOpElem(a.sum);  
}

// #export(BinOpElem)
fn identityOp() -> BinOpElem {
    return BinOpElem(0.0);
}
