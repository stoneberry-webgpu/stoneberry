---
id: "index"
title: "stoneberry"
sidebar_label: "Readme"
sidebar_position: 0
custom_edit_url: null
---

[Stoneberry] is a collection of core shaders for WebGPU. Prefix Scan, Reduce, Histogram, etc.

### Using Stoneberry
Documentation and examples of use are available at [stoneberry.dev][]

### Building Stoneberry

The core library is in packages/stoneberry.

To setup and run tests:
```sh
$ cd packages/stoneberry
$ pnpm i 
$ pnpm cypress-component
```

### Updating Documentation
The documentation site is in packages/doc-site.

To setup and display documentation locally:
```sh
$ cd packages/doc-site
$ pnpm i 
$ pnpm start
```

### Documentation Examples
The documentation code examples are packages/examples

To setup and run a code example locally:
```sh
$ cd packages/examples
$ pnpm i 
$ pnpm dev
```

### Running benchmarks
The benchmarks project is in packages/bench.

To run the benchmark script: 
```sh
$ cd packages/bench
$ pnpm i
$ pnpm bench
```
results are appended to the file: `benchmarks.csv`.

[stoneberry.dev]: https://stoneberry.dev
[stoneberry]: https://www.npmjs.com/package/stoneberry
