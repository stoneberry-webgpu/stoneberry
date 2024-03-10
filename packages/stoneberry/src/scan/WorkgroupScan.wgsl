// #module stoneberry.WorkgroupScan

// Kogge-Stone / Hillis Steele parallel prefix scan of a workgroup sized data array
//
// calculate the prefix scan of block of the input array
// . emit the inclusive prefix scan of the input array to the (equal sized) prefix scan output array
// . also emit the sum for the block to the blockSum output array
//
// note that the prefix scan results are partial if the input array is larger than the workgroup size
// . in that case a subsequent pass is required (to sum the blockSums and add them to the prefixScan results)
//
// summation pattern for inclusive scan:
// 0  1  2  3  4  5  6  7  // src array of 8 elements. scan is calculated in 3 steps:
// 0 01 12 23 34 45 56 67  // offset 1   // [7] = 6+7          // [3] = 2+3         // [1] = 0+1
// 0  1 02 13 24 35 46 57  // offset 2   // [7] = 6+7+4+5      // [3] = 2+3+0+1
// 0  1  2  3 04 15 26 37  // offset 4   // [7] = 6+7+4+5+2+3+0+1
//
// summation pattern for small exlusive scan: 
// 0  1  2  3  4  5  6  7  // src array of 8 elements. scan is calculated in 3 steps:
// 0 01 12 23 34 45 56  _  // offset 1   // [7] = 5+6       
// 0  1 02 13 24 35 46  _  // offset 2   // [7] = 5+6+2+3
// i  0  1  2  3 04 15 26  // offset 4   // [7] = 5+6+2+3+1 
//
// summation of the middle layers is handled in a loop to workgroup workgroup, 
//   double buffering is used to reduce the need for barriers 
//   (otherwise a barrier is needed before as well as after each middle layer scan)
// summation of the first and last layers is handled separately because they read/write 
//   between storage and workgroup memory.

// #template replace

// #import loadOp(Input, Output)
// #import identityOp(Output)
// #import binaryOp(Output)

// #if typecheck
fn loadOp(a: Input) -> Output { return Output(a.sum);  }
fn identityOp() -> Output { return Output(0); }
fn binaryOp(a: Output, b: Output) -> Output { return Output(0);  }
// #endif

// #extends LoadBinOpElem
struct Input { 
// #if typecheck
    sum: u32,  
// #endif
}

// #extends BinOpElem
struct Output { 
// #if typecheck
    sum: u32,  
// #endif
}

struct Uniforms {
    sourceOffset: u32,              // offset in Input elements to start reading in the source
    scanOffset: u32,                // offset in Output elements to writing in the prefixScan buffer
    blockSumOffset: u32,            // offset in Output elements to writing in the blockSum buffer
    exclusiveSmall: u32,            // nonzero for exclusive scan where the source fits in one workgroup
    @align(16) initialValue: Output // initial value for exclusive scan
}

@group(0) @binding(0) var<uniform> u: Uniforms;                           // uniforms
@group(0) @binding(1) var<storage, read> src: array<Input>;               // input source values
@group(0) @binding(2) var<storage, read_write> prefixScan: array<Output>; // output prefix scan
// #if blockSums
@group(0) @binding(3) var<storage, read_write> blockSum: array<Output>;   // output block sums 
// #endif
@group(0) @binding(11) var<storage, read_write> debug: array<f32>;        // buffer to hold debug values

const workgroupSizeX = 4u;      // #replace 4=workgroupSizeX

const srcElems = workgroupSizeX * 2u; 

// doubled buffered intermediate sums
var <workgroup> bankA: array<Output, workgroupSizeX>;  
var <workgroup> bankB: array<Output, workgroupSizeX>; 

@compute
@workgroup_size(workgroupSizeX, 1, 1) 
fn main(
    @builtin(global_invocation_id) grid: vec3<u32>,
    @builtin(local_invocation_id) localGrid: vec3<u32>,
    @builtin(workgroup_id) workGrid: vec3<u32>,
) {
    sumSrcLayerInclusive(localGrid.x, grid.x + u.sourceOffset);
    workgroupBarrier();

    let aIn = sumMiddleLayers(localGrid.x);
    sumFinalLayer(localGrid.x, grid.x + u.scanOffset, workGrid.x + u.blockSumOffset, aIn);
}

// sum the first layer from src to workgroup memory  
fn sumSrcLayerInclusive(localX: u32, sourceDex: u32) {
    var value: Output;
    var end = arrayLength(&src);

    if sourceDex >= end { // unevenly sized array
        value = identityOp(); 
    } else if localX == 0u {
        value = loadOp(src[sourceDex]);
    } else {
        let a = loadOp(src[sourceDex - 1u]);
        let b = loadOp(src[sourceDex]);
        value = binaryOp(a, b);
    }
    bankA[localX] = value;
}

// sum the middle layers from workgroup memory to workgroup memory
fn sumMiddleLayers(localX: u32) -> bool {
    let lastMiddle = workgroupSizeX >> 2u;
    var aIn = true;
    // offset controls the 'stride' to match the kogge stone pairs at each level
    for (var offset = 2u; offset <= lastMiddle; offset <<= 1u) {
        if aIn {
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

// For an exclusive scan there are two cases:
//   . if the results of the first pass fits inside the workgroup, then we need special 
//     code in this shader for the final pass to insert the initialValue and shift the 
//     results as we write
//   . if we'll need multiple workgroups, the insert and shift occurs in applyScans. This shader
//     sees things as an inclusive scan
// . The 'exclusiveSmall' flag marks the case for a exclusive scan small enough to fit in one pass
    
// sum the final layer from workgroup memory to storage memory prefixScan and blockSum results
fn sumFinalLayer(localX: u32, destDex: u32, workGridX: u32, aIn: bool) {
    if u.exclusiveSmall == 0u {
        if aIn {
            sumFinalLayerA(localX, destDex, workGridX);
        } else {
            sumFinalLayerB(localX, destDex, workGridX);
        }
    } else {
        if destDex == 0u {
            prefixScan[0] = u.initialValue;
        }
        if aIn {
            sumFinalLayerA(localX, destDex + 1u, workGridX);
        } else {
            sumFinalLayerB(localX, destDex + 1u, workGridX);
        }
    }
}

// sum the final layer from workgroup memory to storage memory prefixScan and blockSum results
fn sumFinalLayerA(localX: u32, destDex: u32, workGridX: u32) {
    let offset = workgroupSizeX >> 1u;
    var result: Output;
    if destDex < arrayLength(&prefixScan) {
        if localX < offset {
            result = bankA[localX];
        } else {
            let a = bankA[localX - offset];
            let b = bankA[localX];
            result = binaryOp(a, b);
        }
        prefixScan[destDex] = result;

// #if blockSums
        if localX == workgroupSizeX - 1u || destDex == arrayLength(&src) - 1u {
            blockSum[workGridX] = result;
        }                                                                     
// #endif
    }
}


// sum the final layer from workgroup memory to storage memory prefixScan and blockSum results
fn sumFinalLayerB(localX: u32, destDex: u32, workGridX: u32) {
    let offset = workgroupSizeX >> 1u;
    var result: Output;
    if destDex < arrayLength(&prefixScan) {
        if localX < offset {
            result = bankB[localX];
        } else {
            let a = bankB[localX - offset];
            let b = bankB[localX];
            result = binaryOp(a, b);
        }
        prefixScan[destDex] = result;

// #if blockSums
        if localX == workgroupSizeX - 1u || destDex == arrayLength(&src) - 1u {
            blockSum[workGridX] = result;
        }                                                                     
// #endif
    }
}