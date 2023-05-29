[stoneberry](../README.md) / [Exports](../modules.md) / Cache

# Interface: Cache<V\>

API for pluggable cache

## Type parameters

| Name | Type |
| :------ | :------ |
| `V` | extends `object` |

## Table of contents

### Methods

- [get](Cache.md#get)
- [set](Cache.md#set)

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

[src/util/Util.ts:15](https://github.com/mighdoll/stoneberry/blob/6624a50/src/util/Util.ts#L15)

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

[src/util/Util.ts:16](https://github.com/mighdoll/stoneberry/blob/6624a50/src/util/Util.ts#L16)
