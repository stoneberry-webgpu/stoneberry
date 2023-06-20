---
id: "PrefixScan"
title: "Class: PrefixScan<T>"
sidebar_label: "PrefixScan"
sidebar_position: 0
custom_edit_url: null
---

A cascade of shaders to do a prefix scan operation, based on a shader that
does a prefix scan of a workgroup sized chunk of data (e.g. 64 or 256 elements).

The scan operation is parameterized by a template mechanism. The user can
instantiate a PrefixScan with sum to get prefix-sum, or use another template for
other parallel scan applications.

For small data sets that fit in workgroup, only a single shader pass is needed.
For larger data sets, a sequence of shaders is orchestrated as follows:

  1. One shader does a prefix scan on each workgroup sized chunk of data.
    It emits a partial prefix sum for each workgroup and single block level sum from each workgroup
  2. Another instance of the same shader does a prefix scan on the block sums from the previous shader.
    The end result is a set of block level prefix sums
  3. A final shader sums the block prefix sums back with the partial prefix sums

For for very large data sets, steps 2 and 3 repeat heirarchically.
Each level of summing reduces the data set by a factor of the workgroup size.
So three levels handles e.g. 16M elements (256 ** 3) if the workgroup size is 256.

## Type parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `T` | `number` | Type of elements returned from the scan |

## Hierarchy

- `HasReactive`

  ↳ **`PrefixScan`**

## Implements

- [`ComposableShader`](../interfaces/ComposableShader.md)

## Constructors

### constructor

• **new PrefixScan**<`T`\>(`args`)

Create a new scanner

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `number` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `args` | [`PrefixScanArgs`](../interfaces/PrefixScanArgs.md) |

#### Overrides

HasReactive.constructor

#### Defined in

[packages/stoneberry/src/scan/PrefixScan.ts:129](https://github.com/stoneberry-webgpu/stoneberry/blob/72dad75/packages/stoneberry/src/scan/PrefixScan.ts#L129)

## Properties

### exclusive

• **exclusive**: `boolean`

Inclusive scan accumulates a binary operation across all source elements.
Exclusive scan accumulates a binary operation across source elements, using initialValue
as the first element and stopping before the final source element.

**`Default Value`**

false (inclusive scan).

#### Defined in

[packages/stoneberry/src/scan/PrefixScan.ts:108](https://github.com/stoneberry-webgpu/stoneberry/blob/72dad75/packages/stoneberry/src/scan/PrefixScan.ts#L108)

___

### initialValue

• `Optional` **initialValue**: `number`

Initial value for exclusive scan

**`Default Value`**

0

#### Defined in

[packages/stoneberry/src/scan/PrefixScan.ts:113](https://github.com/stoneberry-webgpu/stoneberry/blob/72dad75/packages/stoneberry/src/scan/PrefixScan.ts#L113)

___

### label

• `Optional` **label**: `string`

Debug label attached to gpu objects for error reporting

#### Defined in

[packages/stoneberry/src/scan/PrefixScan.ts:90](https://github.com/stoneberry-webgpu/stoneberry/blob/72dad75/packages/stoneberry/src/scan/PrefixScan.ts#L90)

___

### maxWorkgroups

• `Optional` **maxWorkgroups**: `number`

Override to set max number of workgroups for dispatch e.g. for testing.

**`Default Value`**

maxComputeWorkgroupsPerDimension from the `GPUDevice`

#### Defined in

[packages/stoneberry/src/scan/PrefixScan.ts:100](https://github.com/stoneberry-webgpu/stoneberry/blob/72dad75/packages/stoneberry/src/scan/PrefixScan.ts#L100)

___

### src

• **src**: `GPUBuffer`

Source data to be scanned

#### Defined in

[packages/stoneberry/src/scan/PrefixScan.ts:87](https://github.com/stoneberry-webgpu/stoneberry/blob/72dad75/packages/stoneberry/src/scan/PrefixScan.ts#L87)

___

### template

• **template**: `ScanTemplate`

customize the type of scan (e.g. prefix sum on 32 bit floats)

#### Defined in

[packages/stoneberry/src/scan/PrefixScan.ts:84](https://github.com/stoneberry-webgpu/stoneberry/blob/72dad75/packages/stoneberry/src/scan/PrefixScan.ts#L84)

___

### workgroupLength

• `Optional` **workgroupLength**: `number`

Override to set compute workgroup size e.g. for testing.

**`Default Value`**

max workgroup size of the `GPUDevice`

#### Defined in

[packages/stoneberry/src/scan/PrefixScan.ts:95](https://github.com/stoneberry-webgpu/stoneberry/blob/72dad75/packages/stoneberry/src/scan/PrefixScan.ts#L95)

## Accessors

### result

• `get` **result**(): `GPUBuffer`

Buffer Containing results of the scan after the shader has run.

#### Returns

`GPUBuffer`

#### Defined in

[packages/stoneberry/src/scan/PrefixScan.ts:166](https://github.com/stoneberry-webgpu/stoneberry/blob/72dad75/packages/stoneberry/src/scan/PrefixScan.ts#L166)

## Methods

### commands

▸ **commands**(`commandEncoder`): `void`

Add compute or render passes for this shader to the provided GPUCommandEncoder

#### Parameters

| Name | Type |
| :------ | :------ |
| `commandEncoder` | `GPUCommandEncoder` |

#### Returns

`void`

#### Implementation of

[ComposableShader](../interfaces/ComposableShader.md).[commands](../interfaces/ComposableShader.md#commands)

#### Defined in

[packages/stoneberry/src/scan/PrefixScan.ts:134](https://github.com/stoneberry-webgpu/stoneberry/blob/72dad75/packages/stoneberry/src/scan/PrefixScan.ts#L134)

___

### destroy

▸ **destroy**(): `void`

Release the scanResult buffer for destruction.

#### Returns

`void`

#### Implementation of

[ComposableShader](../interfaces/ComposableShader.md).[destroy](../interfaces/ComposableShader.md#destroy)

#### Defined in

[packages/stoneberry/src/scan/PrefixScan.ts:139](https://github.com/stoneberry-webgpu/stoneberry/blob/72dad75/packages/stoneberry/src/scan/PrefixScan.ts#L139)

___

### scan

▸ **scan**(): `Promise`<`number`[]\>

Execute the prefix scan immediately and copy the results back to the CPU.
(results are copied from the [result](PrefixScan.md#result) GPUBuffer)

#### Returns

`Promise`<`number`[]\>

the scanned result in an array

#### Defined in

[packages/stoneberry/src/scan/PrefixScan.ts:147](https://github.com/stoneberry-webgpu/stoneberry/blob/72dad75/packages/stoneberry/src/scan/PrefixScan.ts#L147)
