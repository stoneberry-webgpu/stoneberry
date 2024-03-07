// #module stoneberry.BinOpMinMaxF32


// #export
struct LoadBinOpElem {
    min: f32,  
    max: f32,  
}

// #export 
struct BinOpElem { 
    min: f32,  
    max: f32,  
}

// #export(BinOpElem)
fn binaryOp(a: BinOpElem, b: BinOpElem) -> BinOpElem {
    return BinOpElem(min(a.min, b.min), max(a.max, b.max));
}

// #export(LoadElem, BinOpElem)
fn loadOp(a: LoadElem) -> BinOpElem {
    return BinOpElem(a.min, a.max);
}

// #export(BinOpElem)
fn identityOp() -> BinOpElem {
    return BinOpElem(1e38, -1e38);
}
