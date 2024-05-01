// #module stoneberry.HistogramOps
// #template simple

// #if typecheck
const buckets = 128u;
// #endif

// #export
struct LoadBinOpElem {
    histogram: array<u32, buckets>,                        
}

// #export 
struct BinOpElem { 
    histogram: array<u32, buckets>,                        
}

// #export(BinOpElem)
fn binaryOp(a: BinOpElem, b: BinOpElem) -> BinOpElem {
    var result: array<u32, buckets>;
    for (var i = 0u; i < buckets; i = i + 1u) {
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
    return BinOpElem(array<u32,buckets>());
}