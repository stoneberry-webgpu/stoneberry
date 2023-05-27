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

[src/scan/PrefixScan.ts:120](https://github.com/mighdoll/stoneberry/blob/a3fc75d/src/scan/PrefixScan.ts#L120)

## Properties

### exclusive

• **exclusive**: `boolean`

Inclusive scan accumulates a binary operation across all source elements.
Exclusive scan accumulates a binary operation across source elements, using initialValue
as the first element and stopping before the final source element.

**`Default Value`**

false (inclusive scan).

#### Defined in

[src/scan/PrefixScan.ts:99](https://github.com/mighdoll/stoneberry/blob/a3fc75d/src/scan/PrefixScan.ts#L99)

___

### initialValue

• `Optional` **initialValue**: `number`

Initial value for exclusive scan

**`Default Value`**

template identity

#### Defined in

[src/scan/PrefixScan.ts:104](https://github.com/mighdoll/stoneberry/blob/a3fc75d/src/scan/PrefixScan.ts#L104)

___

### label

• `Optional` **label**: `string`

Debug label attached to gpu objects for error reporting

#### Defined in

[src/scan/PrefixScan.ts:86](https://github.com/mighdoll/stoneberry/blob/a3fc75d/src/scan/PrefixScan.ts#L86)

___

### src

• **src**: `GPUBuffer`

Source data to be scanned

#### Defined in

[src/scan/PrefixScan.ts:83](https://github.com/mighdoll/stoneberry/blob/a3fc75d/src/scan/PrefixScan.ts#L83)

___

### template

• **template**: `ScanTemplate`

customize the type of scan (e.g. prefix sum on 32 bit floats)

#### Defined in

[src/scan/PrefixScan.ts:80](https://github.com/mighdoll/stoneberry/blob/a3fc75d/src/scan/PrefixScan.ts#L80)

___

### workgroupLength

• `Optional` **workgroupLength**: `number`

Override to set compute workgroup size e.g. for testing.

**`Default Value`**

max workgroup size of the `GPUDevice`

#### Defined in

[src/scan/PrefixScan.ts:91](https://github.com/mighdoll/stoneberry/blob/a3fc75d/src/scan/PrefixScan.ts#L91)

## Accessors

### result

• `get` **result**(): `GPUBuffer`

Buffer Containing results of the scan after the shader has run.

#### Returns

`GPUBuffer`

#### Defined in

[src/scan/PrefixScan.ts:150](https://github.com/mighdoll/stoneberry/blob/a3fc75d/src/scan/PrefixScan.ts#L150)

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

[src/scan/PrefixScan.ts:125](https://github.com/mighdoll/stoneberry/blob/a3fc75d/src/scan/PrefixScan.ts#L125)

___

### destroy

▸ **destroy**(): `void`

Release the scanResult buffer for destruction.

#### Returns

`void`

#### Defined in

[src/scan/PrefixScan.ts:130](https://github.com/mighdoll/stoneberry/blob/a3fc75d/src/scan/PrefixScan.ts#L130)

___

### scan

▸ **scan**(): `Promise`<`number`[]\>

Execute the prefix scan immediately and copy the results back to the CPU.
(results are copied from the [result](PrefixScan.md#result) GPUBuffer)

#### Returns

`Promise`<`number`[]\>

the scanned result in an array

#### Defined in

[src/scan/PrefixScan.ts:138](https://github.com/mighdoll/stoneberry/blob/a3fc75d/src/scan/PrefixScan.ts#L138)
