struct LoadElem {
// #export LoadElemFields
    min: f32,  
    max: f32,  
// #endExport
}

struct Elem { 
// #export ElemFields
    min: f32,  
    max: f32,  
// #endExport
}

// #export(Elem)
fn binaryOp(a: Elem, b: Elem) -> Elem {
    return Elem(min(a.min, b.min), max(a.max, b.max));
}

// #export(LoadElem, Elem)
fn loadOp(a: LoadElem) -> Elem {
    return Elem(a.min, a.max);  
}

// #export(Elem)
fn identityOp() -> Elem {
    return Elem(1e38, -1e38);
}
