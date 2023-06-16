struct Output { 
    sum: u32,  //! "sum: u32,"=outputStruct 
}

struct Uniforms {
    partialScanOffset: u32,         // offset in Output elements when reading from partialScan buffer
    scanOffset: u32,                // offset in Output elements to writing in the prefixScan buffer
    blockSumsOffset: u32,           // offset in Output elements to reading in the blockSum buffer
    exclusiveSmall: u32,            // nonzero for exclusive scan where the source fits in one workgroup
    @align(16) initialValue: Output // initial value for exclusive scan
}

@group(0) @binding(0) var<uniform> u: Uniforms;      
@group(0) @binding(2) var<storage, read> partialScan: array<Output>;      // src partial prefix scan
@group(0) @binding(3) var<storage, read> blockSum : array<Output>;        // src block sums
@group(0) @binding(4) var<storage, read_write> prefixScan: array<Output>; // output prefix scan
@group(0) @binding(11) var<storage, read_write> debug: array<f32>;        // buffer to hold debug values

const workgroupSizeX = 4u;      //! 4=workgroupSizeX

// apply block sums to partial scan results
@compute
@workgroup_size(workgroupSizeX, 1, 1) 
fn applyScanBlocks(
    @builtin(global_invocation_id) grid: vec3<u32>,
    @builtin(workgroup_id) workGrid: vec3<u32>,
) {
    var destX: u32;
    if u.exclusiveSmall == 0u {
        destX = grid.x + u.scanOffset;
    } else {
        destX = grid.x + 1u + u.scanOffset;
        if grid.x == 0u {
            prefixScan[u.scanOffset] = u.initialValue;
        }
    }
    if (destX < arrayLength(&prefixScan)) {
        if workGrid.x == 0u && u.blockSumsOffset == 0u { 
            // if blocksumsOffset is 0, we are in the first dispatch
            // so our first partial scan element is the first from the entire partial scan
            prefixScan[destX] = partialScan[grid.x + u.partialScanOffset];
        } else {
            let a = partialScan[grid.x + u.partialScanOffset];
            let b = blockSum[workGrid.x + u.blockSumsOffset - 1u];
            prefixScan[destX] = binaryOp(a, b);
        }
    }
}

fn binaryOp(a: Output, b: Output) -> Output {
    return Output(a.sum + b.sum);  //! "return Output(a.sum + b.sum);"=binaryOp
}