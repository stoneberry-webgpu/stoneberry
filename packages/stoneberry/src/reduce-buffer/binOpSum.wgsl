struct Elem { 
    sum: f32,  
}

// #export(Elem)
fn binaryOp(a: Elem, b: Elem) -> Elem {
    return Elem(a.sum + b.sum);
}