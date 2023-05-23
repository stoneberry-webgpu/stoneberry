---
id: "PrefixScan"
title: "Class: PrefixScan<T>"
sidebar_label: "PrefixScan"
sidebar_position: 0
custom_edit_url: null
---

A cascade of shaders to do a prefix scan operation, based on a shader that
does a prefix scan of a workgroup sized chunk of data (e.g. perhaps 64 or 256 elements).

The scan operation is parameterized by a template mechanism. The user can
instantiate a PrefixScan with sum to get prefix-sum, or use another template for
other parallel scan applications.

For small data sets that fit in workgroup, only a single shader pass is needed.

For larger data sets, a sequence of shaders is orchestrated as follows:
1 one shader does a prefix scan on each workgroup sized chunk of data
  . it emits a partial prefix sum for each workgroup and single block level sum from each workgroup
2 another instance of the same shader does a prefix scan on the block sums from the previous shader
  . the end result is a set of block level prefix sums
3 a final shader sums the block prefix sums back with the partial prefix sums

For for very large data sets, steps 2 and 3 repeat heirarchically.
Each level of summing reduces the data set by a factor of the workgroup size.
So three levels handles e.g. 16M elements (256 ** 3) if workgroup size is 256.

## Type parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `T` | `number` | Type of returned elements from the scan |

## Hierarchy

- `HasReactive`

  ↳ **`PrefixScan`**

## Implements

- `ComposableShader`

## Constructors

### constructor

• **new PrefixScan**<`T`\>(`args`)

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

[src/scan/PrefixScan.ts:73](https://github.com/mighdoll/stoneberry/blob/35485a4/src/scan/PrefixScan.ts#L73)

## Properties

### exclusive

• **exclusive**: `boolean`

#### Defined in

[src/scan/PrefixScan.ts:67](https://github.com/mighdoll/stoneberry/blob/35485a4/src/scan/PrefixScan.ts#L67)

___

### initialValue

• `Optional` **initialValue**: `number`

#### Defined in

[src/scan/PrefixScan.ts:66](https://github.com/mighdoll/stoneberry/blob/35485a4/src/scan/PrefixScan.ts#L66)

___

### label

• `Optional` **label**: `string`

#### Defined in

[src/scan/PrefixScan.ts:65](https://github.com/mighdoll/stoneberry/blob/35485a4/src/scan/PrefixScan.ts#L65)

___

### src

• **src**: `GPUBuffer`

#### Defined in

[src/scan/PrefixScan.ts:63](https://github.com/mighdoll/stoneberry/blob/35485a4/src/scan/PrefixScan.ts#L63)

___

### template

• **template**: `ScanTemplate`

#### Defined in

[src/scan/PrefixScan.ts:62](https://github.com/mighdoll/stoneberry/blob/35485a4/src/scan/PrefixScan.ts#L62)

___

### workgroupLength

• `Optional` **workgroupLength**: `number`

#### Defined in

[src/scan/PrefixScan.ts:64](https://github.com/mighdoll/stoneberry/blob/35485a4/src/scan/PrefixScan.ts#L64)

## Accessors

### result

• `get` **result**(): `GPUBuffer`

#### Returns

`GPUBuffer`

#### Defined in

[src/scan/PrefixScan.ts:98](https://github.com/mighdoll/stoneberry/blob/35485a4/src/scan/PrefixScan.ts#L98)

## Methods

### commands

▸ **commands**(`commandEncoder`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `commandEncoder` | `GPUCommandEncoder` |

#### Returns

`void`

#### Implementation of

ComposableShader.commands

#### Defined in

[src/scan/PrefixScan.ts:78](https://github.com/mighdoll/stoneberry/blob/35485a4/src/scan/PrefixScan.ts#L78)

___

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Defined in

[src/scan/PrefixScan.ts:82](https://github.com/mighdoll/stoneberry/blob/35485a4/src/scan/PrefixScan.ts#L82)

___

### scan

▸ **scan**(): `Promise`<`number`[]\>

Execute the prefix scan and copy the results back to the CPU

#### Returns

`Promise`<`number`[]\>

#### Defined in

[src/scan/PrefixScan.ts:87](https://github.com/mighdoll/stoneberry/blob/35485a4/src/scan/PrefixScan.ts#L87)
