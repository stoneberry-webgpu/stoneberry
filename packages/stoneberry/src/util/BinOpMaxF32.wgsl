struct LoadElem {
// #export LoadElemFields
    max: f32,   
// #endExport
}

struct Elem { 
// #export ElemFields
    max: f32,  
// #endExport
}

// #export(Elem)
fn binaryOp(a: Elem, b: Elem) -> Elem {
    return Elem(max(a.max, b.max));
}

// #export(LoadElem, Elem)
fn loadOp(a: LoadElem) -> Elem {
    return Elem(a.max);  
}

// #export(Elem)
fn identityOp() -> Elem {
    return Elem(0.0);
}
