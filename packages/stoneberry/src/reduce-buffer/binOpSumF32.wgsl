struct Elem { 
    sum: f32,  
}

struct InputElem { 
    sum: f32,  
}

//#exportGroup(binaryOps, Elem, InputElem, texelType)

//#export(Elem)
fn binaryOp(a: Elem, b: Elem) -> Elem {
    return Elem(a.sum + b.sum);
}

//#export(Elem, InputElem)
fn loadOp(a: InputElem) -> Elem {
    return Elem(a.sum);
}

//#export(Elem, InputElem)
fn identityOp() -> Elem {
    return Elem(0.);
}

//#export(Elem, texelType) template(thimb2)
fn createOp(a: f32) -> Elem { // #replace f32=texelType
    return Elem(a); 
}
