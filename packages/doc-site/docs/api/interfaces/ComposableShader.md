---
id: "ComposableShader"
title: "Interface: ComposableShader"
sidebar_label: "ComposableShader"
sidebar_position: 0
custom_edit_url: null
---

An interface for modular shaders

## Implemented by

- [`PrefixScan`](../classes/PrefixScan.md)

## Properties

### debugLogging

• `Optional` **debugLogging**: (`debugFlags`: `Record`<`string`, `unknown`\>) => `void`

#### Type declaration

▸ (`debugFlags`): `void`

std interface to pass flags to control logging

##### Parameters

| Name | Type |
| :------ | :------ |
| `debugFlags` | `Record`<`string`, `unknown`\> |

##### Returns

`void`

#### Defined in

node_modules/.pnpm/thimbleberry@0.1.12/node_modules/thimbleberry/dist/shader-util/ComposableShader.d.ts:7

___

### destroy

• `Optional` **destroy**: () => `void`

#### Type declaration

▸ (): `void`

cleanup unused gpu resources

##### Returns

`void`

#### Defined in

node_modules/.pnpm/thimbleberry@0.1.12/node_modules/thimbleberry/dist/shader-util/ComposableShader.d.ts:9

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

node_modules/.pnpm/thimbleberry@0.1.12/node_modules/thimbleberry/dist/shader-util/ComposableShader.d.ts:5
