// #module stoneberry.HistogramTexture

// #template replace

// #export
struct LoadBinOpElem {
    histogram: array<u32, 128>,                       // #replace 128=buckets
}

//#export 
struct BinOpElem { 
    histogram: array<u32, 128>,                       // #replace 128=buckets
}

// #export(BinOpElem)
fn binaryOp(a: BinOpElem, b: BinOpElem) -> BinOpElem {
    var result: array<u32, 128>;                       // #replace 128=buckets
    for (var i = 0u; i < 128u; i = i + 1u) { // #replace 128=buckets
        result[i] = a.histogram[i] + b.histogram[i];
    }
    return BinOpElem(result);
}

// #export(LoadBinOpElem, BinOpElem)
fn loadOp(a: LoadBinOpElem) -> BinOpElem {
    return BinOpElem(a.histogram);
}

// #export(BinOpElem)
fn identityOp() -> BinOpElem {
    return BinOpElem(array<u32,128>());                    // #replace 128=buckets
}