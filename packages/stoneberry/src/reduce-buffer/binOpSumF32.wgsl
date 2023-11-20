struct Elem { 
    sum: f32,  
}

struct InputElem { 
    sum: f32,  
}

// #export BinaryOp(Elem, InputElem, texelType)
// #template thimble2

fn binaryOp(a: Elem, b: Elem) -> Elem {
    return Elem(a.sum + b.sum);
}

fn loadOp(a: InputElem) -> Elem {
    return Elem(a.sum);
}

fn identityOp() -> Elem {
    return Elem(0.);
}

fn createOp(a: f32) -> Elem { // #replace f32=texelType
    return Elem(a); 
}