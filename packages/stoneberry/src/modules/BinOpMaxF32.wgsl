// #module stoneberry.BinOpMaxF32

// #export
struct LoadBinOpElem {
    max: f32,  
}

// #export 
struct BinOpElem { 
    max: f32,  
}

// #export(BinOpElem)
fn binaryOp(a: BinOpElem, b: BinOpElem) -> BinOpElem {
    return BinOpElem(max(a.max, b.max));
}

// #export(LoadElem, BinOpElem)
fn loadOp(a: LoadElem) -> BinOpElem {
    return BinOpElem(a.max);
}

// #export(BinOpElem)
fn identityOp() -> BinOpElem {
    return BinOpElem(0.0);
}
