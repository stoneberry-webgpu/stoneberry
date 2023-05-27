---
id: "PrefixScanArgs"
title: "Interface: PrefixScanArgs"
sidebar_label: "PrefixScanArgs"
sidebar_position: 0
custom_edit_url: null
---

Parameters to construct a [PrefixScan](../classes/PrefixScan.md) instance.

## Properties

### device

• **device**: `GPUDevice`

#### Defined in

[src/scan/PrefixScan.ts:17](https://github.com/mighdoll/stoneberry/blob/7a87c28/src/scan/PrefixScan.ts#L17)

___

### exclusive

• `Optional` **exclusive**: `boolean`

Inclusive scan accumulates a binary operation across all source elements.
Exclusive scan accumulates a binary operation across source elements, using initialValue
as the first element and stopping before the final source element.

#### Defined in

[src/scan/PrefixScan.ts:31](https://github.com/mighdoll/stoneberry/blob/7a87c28/src/scan/PrefixScan.ts#L31)

___

### initialValue

• `Optional` **initialValue**: `number`

Initial value for exclusive scan

#### Defined in

[src/scan/PrefixScan.ts:34](https://github.com/mighdoll/stoneberry/blob/7a87c28/src/scan/PrefixScan.ts#L34)

___

### label

• `Optional` **label**: `string`

Debug label attached to gpu objects for error reporting

#### Defined in

[src/scan/PrefixScan.ts:37](https://github.com/mighdoll/stoneberry/blob/7a87c28/src/scan/PrefixScan.ts#L37)

___

### pipelineCache

• `Optional` **pipelineCache**: <T\>() => [`Cache`](Cache.md)<`T`\>

#### Type declaration

▸ <`T`\>(): [`Cache`](Cache.md)<`T`\>

cache for GPUComputePipeline or GPURenderPipeline

##### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `object` |

##### Returns

[`Cache`](Cache.md)<`T`\>

#### Defined in

[src/scan/PrefixScan.ts:43](https://github.com/mighdoll/stoneberry/blob/7a87c28/src/scan/PrefixScan.ts#L43)

___

### src

• **src**: [`ValueOrFn`](../modules.md#valueorfn)<`GPUBuffer`\>

Source data to be scanned.

A function returning the source buffer will be executed lazily, 
and reexecuted if the functions `@reactively` source values change.

#### Defined in

[src/scan/PrefixScan.ts:25](https://github.com/mighdoll/stoneberry/blob/7a87c28/src/scan/PrefixScan.ts#L25)

___

### template

• `Optional` **template**: `ScanTemplate`

customize the type of scan (e.g. prefix sum on 32 bit floats)

#### Defined in

[src/scan/PrefixScan.ts:28](https://github.com/mighdoll/stoneberry/blob/7a87c28/src/scan/PrefixScan.ts#L28)

___

### workgroupLength

• `Optional` **workgroupLength**: `number`

Override to set compute workgroup size e.g. for testing.

#### Defined in

[src/scan/PrefixScan.ts:40](https://github.com/mighdoll/stoneberry/blob/7a87c28/src/scan/PrefixScan.ts#L40)
