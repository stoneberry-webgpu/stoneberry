---
id: "PrefixScanArgs"
title: "Interface: PrefixScanArgs"
sidebar_label: "PrefixScanArgs"
sidebar_position: 0
custom_edit_url: null
---

Parameters to construct a [PrefixScan](../classes/PrefixScan.md) instance

## Properties

### device

• **device**: `GPUDevice`

#### Defined in

[src/scan/PrefixScan.ts:18](https://github.com/mighdoll/stoneberry/blob/a0ccd1d/src/scan/PrefixScan.ts#L18)

___

### exclusive

• `Optional` **exclusive**: `boolean`

Inclusive scan accumulates a binary operation across all source elements.
Exclusive scan accumulates a binary operation across source elements, using initialValue
as the first element and stopping before the final source element.

#### Defined in

[src/scan/PrefixScan.ts:30](https://github.com/mighdoll/stoneberry/blob/a0ccd1d/src/scan/PrefixScan.ts#L30)

___

### initialValue

• `Optional` **initialValue**: `number`

Initial value for exclusive scan

#### Defined in

[src/scan/PrefixScan.ts:33](https://github.com/mighdoll/stoneberry/blob/a0ccd1d/src/scan/PrefixScan.ts#L33)

___

### label

• `Optional` **label**: `string`

Debug label attached to gpu objects for error reporting

#### Defined in

[src/scan/PrefixScan.ts:36](https://github.com/mighdoll/stoneberry/blob/a0ccd1d/src/scan/PrefixScan.ts#L36)

___

### pipelineCache

• `Optional` **pipelineCache**: <T\>() => `Cache`<`T`\>

#### Type declaration

▸ <`T`\>(): `Cache`<`T`\>

{@inheritDoc PrefixScan#pipelineCache}

##### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `object` |

##### Returns

`Cache`<`T`\>

#### Defined in

[src/scan/PrefixScan.ts:42](https://github.com/mighdoll/stoneberry/blob/a0ccd1d/src/scan/PrefixScan.ts#L42)

___

### src

• **src**: `ValueOrFn`<`GPUBuffer`\>

Source data to be scanned. 
If a function returning a buffer is provided, the function 
will be executed whenever src is read.

#### Defined in

[src/scan/PrefixScan.ts:24](https://github.com/mighdoll/stoneberry/blob/a0ccd1d/src/scan/PrefixScan.ts#L24)

___

### template

• `Optional` **template**: `ScanTemplate`

customize the type of scan (e.g. prefix sum on 32 bit floats)

#### Defined in

[src/scan/PrefixScan.ts:27](https://github.com/mighdoll/stoneberry/blob/a0ccd1d/src/scan/PrefixScan.ts#L27)

___

### workgroupLength

• `Optional` **workgroupLength**: `number`

Override to set compute workgroup size e.g. for testing.

#### Defined in

[src/scan/PrefixScan.ts:39](https://github.com/mighdoll/stoneberry/blob/a0ccd1d/src/scan/PrefixScan.ts#L39)
