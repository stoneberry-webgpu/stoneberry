struct LoadElem {
    sum: i32,  
}
struct Elem { 
    sum: i32,  
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
    return Elem(0);
}