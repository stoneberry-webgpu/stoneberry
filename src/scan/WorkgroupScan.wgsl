// Kogge-Stone / Hillis Steele parallel prefix scan of a workgroup sized data array
//
// calculate the prefix scan of block of the input array
// . emit the inclusive prefix scan of the input array to the (equal sized) prefix scan output array
// . also emit the sum for the block to the blockSum output array
//
// note that the prefix scan results are partial if the input array is larger than the workgroup size
// . in that case a subsequent pass is required (to sum the blockSums and add them to the prefixScan results)
//
// summation pattern:
// 0  1  2  3  4  5  6  7  // src array of 8 elements. scan is calculated in 3 steps:
// 0 01 12 23 34 45 56 67  // offset 1   // [7]= 6+7           // [3] = 2+3         // [1] = 0+1
// 0  1 02 13 24 35 46 57  // offset 2   // [7] = 6+7+4+5      // [3] = 2+3+0+1
// 0  1  2  3 04 15 26 37  // offset 4   // [7] = 6+7+4+5+2+3+0+1
//
// summation of the middle layers is handled in a loop to workgroup workgroup, 
//   double buffering is used to reduce the need for barriers 
//   (otherwise a barrier is needed before as well as after each middle layer scan)
// summation of the first and last layers is handled separately because they read/write 
//   between storage and workgroup memory.

struct Input { 
    sum: u32,  //! "sum: u32,"=inputStruct 
}

struct Output { 
    sum: u32,  //! "sum: u32,"=outputStruct 
}

struct Uniforms {
    exclusive: u32,                 // nonzero if exclusive scan
    @align(16) initialValue: Output // initial value for exclusive scan
}

@group(0) @binding(0) var<uniform> u: Uniforms;                     // uniforms
@group(0) @binding(1) var<storage, read> src: array<Input>;               // input source values
@group(0) @binding(2) var<storage, read_write> prefixScan: array<Output>; // output prefix scan
@group(0) @binding(3) var<storage, read_write> blockSum: array<Output>;   // output block sums //! IF blockSums
@group(0) @binding(11) var<storage, read_write> debug: array<f32>;        // buffer to hold debug values

const workgroupSizeX = 4u;      //! 4=workgroupSizeX

const srcElems = workgroupSizeX * 2u; 

// doubled buffered intermediate sums
var <workgroup> bankA: array<Output, workgroupSizeX>;  
var <workgroup> bankB: array<Output, workgroupSizeX>; 

@compute
@workgroup_size(workgroupSizeX, 1, 1) 
fn workgroupPrefixScan(
    @builtin(global_invocation_id) grid: vec3<u32>,
    @builtin(local_invocation_id) localGrid: vec3<u32>,
    @builtin(workgroup_id) workGrid: vec3<u32>,
) {
    if u.exclusive == 0u {
        sumSrcLayerInclusive(localGrid.x, grid.x);
    } else  {
        sumSrcLayerExclusive(localGrid.x, grid.x);
    }

    let aIn = sumMiddleLayers(localGrid.x);
    sumFinalLayer(localGrid.x, grid.x, workGrid.x, aIn);
}

// sum the first layer from src to workgroup memory  
fn sumSrcLayerInclusive(localX: u32, gridX: u32) {
    var value: Output;
    var end = arrayLength(&src);

    if gridX >= end { // unevenly sized array
        value = identityOp(); 
    } else if localX == 0u { 
        value = loadOp(src[gridX]);
    } else {
        let a = loadOp(src[gridX - 1u]);
        let b = loadOp(src[gridX]);
        value = binaryOp(a, b);
    }
    bankA[localX] = value;
    workgroupBarrier();
}

// sum the first layer from src to workgroup memory  
fn sumSrcLayerExclusive(localX: u32, gridX: u32) {
    var value: Output;
    var end = arrayLength(&src);

    if gridX >= end { // unevenly sized array
        value = identityOp(); 
    } else if gridX == 0u {
        value = u.initialValue;
    } else if gridX == 1u {
        value = loadOp(src[gridX - 1u]);
    } else {
        let a = loadOp(src[gridX - 2u]);
        let b = loadOp(src[gridX - 1u]);
        value = binaryOp(a, b);
    }
    bankA[localX] = value;
    workgroupBarrier();
}

// sum the middle layers from workgroup memory to workgroup memory
fn sumMiddleLayers(localX: u32) -> bool {
    let lastMiddle = workgroupSizeX >> 2u;
    var aIn = true;
    // offset controls the 'stride' to match the kogge stone pairs at each level
    for (var offset = 2u; offset <= lastMiddle; offset <<= 1u) { 
        if (aIn) {
            sumAtoB(localX, offset); // CONSIDER is there wgsl way to DRY these, perhaps refs to bankA vs bankB?
        } else {
            sumBtoA(localX, offset);
        }
        aIn = !aIn;
        workgroupBarrier();
    }

    return aIn;
}

// sum one of the middle layers
fn sumAtoB(localX: u32, offset: u32) {
    if localX < offset {
        bankB[localX] = bankA[localX];
    } else {
        let a = bankA[localX - offset];
        let b = bankA[localX];
        bankB[localX] = binaryOp(a, b);
    }
}

// sum one of the middle layers
fn sumBtoA(localX: u32, offset: u32) {
    if localX < offset {
        bankA[localX] = bankB[localX];
    } else {
        let a = bankB[localX - offset];
        let b = bankB[localX];
        bankA[localX] = binaryOp(a, b);
    }
}
    
// sum the final layer from workgroup memory to storage memory prefixScan and blockSum results
fn sumFinalLayer(localX: u32, gridX: u32, workGridX: u32, aIn: bool) {
    if u.exclusive == 0u {
        if aIn {
            sumFinalLayerA(localX, gridX, workGridX);
        } else {
            sumFinalLayerB(localX, gridX, workGridX);
        }
    } else {
        if aIn {
            exclusiveSumFinalLayerA(localX, gridX, workGridX);
        } else {
            // TBD
            // exclusiveSumFinalLayerB(localX, gridX, workGridX);
        }
    }     
}

// sum the final layer from workgroup memory to storage memory prefixScan and blockSum results
fn sumFinalLayerA(localX: u32, gridX: u32, workGridX: u32) {
    let offset = workgroupSizeX >> 1u;
    var result: Output;
    if gridX < arrayLength(&src) {
        if localX < offset {
            result = bankA[localX];
        } else {
            let a = bankA[localX - offset];
            let b = bankA[localX];
            result = binaryOp(a, b);
        }
        prefixScan[gridX] = result;

        if localX == workgroupSizeX - 1u || gridX == arrayLength(&src) - 1u {   //! IF blockSums
            blockSum[workGridX] = result;                                       //! IF blockSums
        }                                                                       //! IF blockSums
    }
}

// sum the final layer from workgroup memory to storage memory prefixScan and blockSum results
fn exclusiveSumFinalLayerA(localX: u32, gridX: u32, workGridX: u32) {
    let offset = workgroupSizeX >> 1u;  
    var result: Output;
    debug[0] = f32(bankA[0].sum);
    debug[1] = f32(bankA[1].sum);
    debug[2] = f32(bankA[2].sum);
    debug[3] = f32(bankA[3].sum);
    debug[4] = f32(offset);
    if gridX < arrayLength(&src) {
        if localX <= offset {
            result = bankA[localX];
        } else {
            let a = bankA[localX - offset];
            let b = bankA[localX];
            result = binaryOp(a, b);
        }
        prefixScan[gridX] = result;

        if localX == workgroupSizeX - 1u || gridX == arrayLength(&src) - 1u {   //! IF blockSums
            blockSum[workGridX] = result;                                       //! IF blockSums
        }                                                                       //! IF blockSums
    }
}

// sum the final layer from workgroup memory to storage memory prefixScan and blockSum results
fn sumFinalLayerB(localX: u32, gridX: u32, workGridX: u32) {
    let offset = workgroupSizeX >> 1u;
    var result: Output;
    if gridX < arrayLength(&src) {
        if localX < offset {
            result = bankB[localX];
        } else {
            let a = bankB[localX - offset];
            let b = bankB[localX];
            result = binaryOp(a, b);
        }
        prefixScan[gridX] = result;

        if localX == workgroupSizeX - 1u || gridX == arrayLength(&src) - 1u {   //! IF blockSums
            blockSum[workGridX] = result;                                       //! IF blockSums
        }                                                                       //! IF blockSums
    }
}

fn loadOp(a: Input) -> Output {
    return Output(a.sum);  //! "return Output(a.sum);"=loadOp
}

fn identityOp() -> Output {
    return Output(0); //! "return Output(0);"=identityOp
}

fn binaryOp(a: Output, b: Output) -> Output {
    return Output(a.sum + b.sum);  //! "return Output(a.sum + b.sum);"=binaryOp
}