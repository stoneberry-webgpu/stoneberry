[stoneberry](../README.md) / [Exports](../modules.md) / ComposableShader

# Interface: ComposableShader

Core api for shaders that can be run in a group.

## Implemented by

- [`PrefixScan`](../classes/PrefixScan.md)

## Table of contents

### Methods

- [commands](ComposableShader.md#commands)

## Methods

### commands

▸ **commands**(`encoder`): `void`

Add compute or render passes for this shader to the provided GPUCommandEncoder

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoder` | `GPUCommandEncoder` |

#### Returns

`void`

#### Defined in

[src/util/Util.ts:10](https://github.com/mighdoll/stoneberry/blob/6624a50/src/util/Util.ts#L10)
