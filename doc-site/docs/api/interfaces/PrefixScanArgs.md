---
id: "PrefixScanArgs"
title: "Interface: PrefixScanArgs"
sidebar_label: "PrefixScanArgs"
sidebar_position: 0
custom_edit_url: null
---

## Properties

### device

• **device**: `GPUDevice`

#### Defined in

[src/scan/PrefixScan.ts:16](https://github.com/mighdoll/stoneberry/blob/0059fde/src/scan/PrefixScan.ts#L16)

___

### exclusive

• `Optional` **exclusive**: `boolean`

#### Defined in

[src/scan/PrefixScan.ts:22](https://github.com/mighdoll/stoneberry/blob/0059fde/src/scan/PrefixScan.ts#L22)

___

### initialValue

• `Optional` **initialValue**: `number`

#### Defined in

[src/scan/PrefixScan.ts:23](https://github.com/mighdoll/stoneberry/blob/0059fde/src/scan/PrefixScan.ts#L23)

___

### label

• `Optional` **label**: `string`

#### Defined in

[src/scan/PrefixScan.ts:18](https://github.com/mighdoll/stoneberry/blob/0059fde/src/scan/PrefixScan.ts#L18)

___

### pipelineCache

• `Optional` **pipelineCache**: <T\>() => `Cache`<`T`\>

#### Type declaration

▸ <`T`\>(): `Cache`<`T`\>

##### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `object` |

##### Returns

`Cache`<`T`\>

#### Defined in

[src/scan/PrefixScan.ts:21](https://github.com/mighdoll/stoneberry/blob/0059fde/src/scan/PrefixScan.ts#L21)

___

### src

• **src**: `ValueOrFn`<`GPUBuffer`\>

#### Defined in

[src/scan/PrefixScan.ts:17](https://github.com/mighdoll/stoneberry/blob/0059fde/src/scan/PrefixScan.ts#L17)

___

### template

• `Optional` **template**: `ValueOrFn`<`ScanTemplate`\>

#### Defined in

[src/scan/PrefixScan.ts:19](https://github.com/mighdoll/stoneberry/blob/0059fde/src/scan/PrefixScan.ts#L19)

___

### workgroupLength

• `Optional` **workgroupLength**: `ValueOrFn`<`number`\>

#### Defined in

[src/scan/PrefixScan.ts:20](https://github.com/mighdoll/stoneberry/blob/0059fde/src/scan/PrefixScan.ts#L20)
