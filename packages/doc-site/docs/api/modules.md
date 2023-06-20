---
id: "modules"
title: "stoneberry"
sidebar_label: "Exports"
sidebar_position: 0.5
custom_edit_url: null
---

## Classes

- [PrefixScan](classes/PrefixScan.md)

## Interfaces

- [Cache](interfaces/Cache.md)
- [ComposableShader](interfaces/ComposableShader.md)
- [PrefixScanArgs](interfaces/PrefixScanArgs.md)

## Type Aliases

### ValueOrFn

Ƭ **ValueOrFn**<`T`\>: `T` \| () => `T`

Each value in the params object can be a javascript value, or a function that returns a value.
In all cases, the reactive class will have a reactive property returning a value of the same type.
In all cases, other reactive functions can reference the reactive property and will re-execute
automatically as needed.
Mutating the value of a reactive property depends on the initial value:
  . Reactive properties containing a javascript value only change when the
      programmer explicitly mutates the value.
  . Reactive properties containing a function will re-execute when they are referenced
      if any of their sources have changed.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

node_modules/.pnpm/thimbleberry@0.1.12/node_modules/thimbleberry/dist/shader-util/ReactiveUtil.d.ts:22
