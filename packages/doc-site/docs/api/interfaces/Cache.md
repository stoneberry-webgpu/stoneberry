---
id: "Cache"
title: "Interface: Cache<V>"
sidebar_label: "Cache"
sidebar_position: 0
custom_edit_url: null
---

API for pluggable cache

## Type parameters

| Name | Type |
| :------ | :------ |
| `V` | extends `object` |

## Methods

### get

▸ **get**(`key`): `undefined` \| `V`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`undefined` \| `V`

#### Defined in

[packages/stoneberry/src/util/Util.ts:15](https://github.com/stoneberry-webgpu/stoneberry/blob/5e823b6/packages/stoneberry/src/util/Util.ts#L15)

___

### set

▸ **set**(`key`, `value`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `V` |

#### Returns

`void`

#### Defined in

[packages/stoneberry/src/util/Util.ts:16](https://github.com/stoneberry-webgpu/stoneberry/blob/5e823b6/packages/stoneberry/src/util/Util.ts#L16)
