struct Output { 
    sum: u32,  //! "sum: u32,"=outputStruct 
}

struct Uniforms {
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
        destX = grid.x;
    } else {
        destX = grid.x + 1u;
        if grid.x == 0u {
            prefixScan[0] = u.initialValue;
        }
    }

    if workGrid.x == 0u {
        prefixScan[destX] = partialScan[grid.x];
    } else {
        let a = partialScan[grid.x];
        let b = blockSum[workGrid.x - 1u];
        prefixScan[destX] = binaryOp(a, b);
    }
}

fn binaryOp(a: Output, b: Output) -> Output {
    return Output(a.sum + b.sum);  //! "return Output(a.sum + b.sum);"=binaryOp
}