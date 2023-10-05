import {
  labeledGpuDevice,
  loadRedComponent,
  printBuffer,
  printTexture,
  ShaderGroup,
  trackRelease,
  trackUse,
  withAsyncUsage,
  withBufferCopy,
  withLeakTrack,
} from "thimbleberry";
import { sumF32 } from "../../src/util/BinOpTemplate.js";
import { ReduceTextureToBuffer } from "./../../src/reduce-texture/ReduceTextureToBuffer";
import { make3dSequence, makeTexture } from "./util/MakeTexture.js";

it("reduce texture to buffer, wg 1,1", async () => {
  await withAsyncUsage(async () => {
    const device = await labeledGpuDevice();
    trackUse(device);

    const srcData = make3dSequence([4, 4], 4);
    const source = makeTexture(device, srcData, "rgba32float");
    await withLeakTrack(async () => {
      const tr = new ReduceTextureToBuffer({
        device,
        source,
        blockSize: [2, 2],
        workgroupSize: [1, 1],
        reduceTemplate: sumF32,
        loadTemplate: loadRedComponent,
      });
      trackUse(tr);
      const shaderGroup = new ShaderGroup(device, tr);
      shaderGroup.dispatch();

      await printTexture(device, source, 1);
      await printBuffer(device, tr.reducedResult, "f32");
      // await withBufferCopy(device, tr.reducedResult, "f32", data => {
      //   expect([...data]).deep.eq([120]);
      // });
      trackRelease(tr);
    });
  });
});

// it("texture reduce max", async () => {
//   await withAsyncUsage(async () => {
//     const device = await labeledGpuDevice();
//     trackUse(device);

//     const { texture: srcTexture } = sequenceTexture(device, [4, 4]);
//     const tr = new TextureReduceShader({
//       device,
//       srcTexture,
//       reducedResult: makeBuffer(device, [0], "reducedResult", Float32Array),
//       blockLength: 4,
//       dispatchSize: [1, 1],
//       workgroupSize: [1, 1],
//       reduceTemplate: maxTemplate,
//       loadTemplate: loadRedComponent,
//     });
//     const shaderGroup = new ShaderGroup(device, tr);
//     shaderGroup.dispatch();

//     await withBufferCopy(device, tr.reducedResult, "f32", (data) => {
//       expect([...data]).deep.eq([15]);
//     });
//   });
// });

// it("texture reduce min/max, one dispatch", async () => {
//   await withAsyncUsage(async () => {
//     const device = await labeledGpuDevice();
//     trackUse(device);

//     const { texture: srcTexture } = sequenceTexture(device, [4, 4]);
//     const shader = new TextureReduceShader({
//       device,
//       srcTexture,
//       reducedResult: makeBuffer(device, [0, 0], "reducedResult", Float32Array),
//       blockLength: 4,
//       dispatchSize: [1, 1],
//       workgroupSize: [1, 1],
//       reduceTemplate: minMaxTemplate,
//       loadTemplate: loadRedComponent,
//     });
//     const shaderGroup = new ShaderGroup(device, shader);
//     shaderGroup.dispatch();

//     await withBufferCopy(device, shader.reducedResult, "f32", (data) => {
//       expect([...data]).deep.eq([1, 15]);
//     });
//   });
// });

// it("texture reduce min/max, four dispatches", async () => {
//   await withAsyncUsage(async () => {
//     const device = await labeledGpuDevice();
//     trackUse(device);

//     const { texture: srcTexture } = sequenceTexture(device, [4, 4]);
//     // prettier-ignore
//     const reducedResult = makeBuffer(device, [0, 0, 0, 0, 0, 0, 0, 0], "reducedResult", Float32Array);
//     const shader = new TextureReduceShader({
//       device,
//       srcTexture,
//       reducedResult,
//       blockLength: 2,
//       dispatchSize: [2, 2],
//       workgroupSize: [1, 1],
//       reduceTemplate: minMaxTemplate,
//       loadTemplate: loadRedComponent,
//     });
//     const shaderGroup = new ShaderGroup(device, shader);
//     shaderGroup.dispatch();

//     await withBufferCopy(device, shader.reducedResult, "f32", (data) => {
//       expect([...data]).deep.eq([1, 5, 2, 7, 8, 13, 10, 15]);
//     });
//   });
// });
