// #template replacer
struct LoadElem {
// #export LoadElemFields
    histogram: array<u32, 128>,                       // #replace 128=buckets
// #endExport
}

struct Elem { 
// #export ElemFields
    histogram: array<u32, 128>,                       // #replace 128=buckets
// #endExport
}

// #export(Elem)
fn binaryOp(a: Elem, b: Elem) -> Elem {
    var result: array<u32, 128>;                       // #replace 128=buckets
    for (var i = 0u; i < 128u; i = i + 1u) { // #replace 128=buckets
        result[i] = a.histogram[i] + b.histogram[i];
    }
    return Elem(result);
}

// #export(LoadElem, Elem)
fn loadOp(a: LoadElem) -> Elem {
    return Elem(a.histogram);
}

// #export(Elem)
fn identityOp() -> Elem {
    return Elem(array<u32,128>());                    // #replace 128=buckets
}