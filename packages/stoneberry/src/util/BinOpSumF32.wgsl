struct LoadElem {
// #export LoadElemFields
    sum: f32,  
// #endExport
}

struct Elem { 
// #export ElemFields
    sum: f32,  
// #endExport
}

// #export(Elem)
fn binaryOp(a: Elem, b: Elem) -> Elem {
    return Elem(a.sum + b.sum);
}

// #export(LoadElem, Elem)
fn loadOp(a: LoadElem) -> Elem {
    return Elem(a.sum);  
}

// #export(Elem)
fn identityOp() -> Elem {
    return Elem(0.0);
}
