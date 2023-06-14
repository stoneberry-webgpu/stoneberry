---
id: "ComposableShader"
title: "Interface: ComposableShader"
sidebar_label: "ComposableShader"
sidebar_position: 0
custom_edit_url: null
---

Core api for shaders that can be run in a group.

## Implemented by

- [`PrefixScan`](../classes/PrefixScan.md)

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

[packages/stoneberry/src/util/Util.ts:10](https://github.com/stoneberry-webgpu/stoneberry/blob/5e823b6/packages/stoneberry/src/util/Util.ts#L10)
