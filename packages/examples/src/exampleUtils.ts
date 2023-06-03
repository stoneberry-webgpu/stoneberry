import { labeledGpuDevice } from "thimbleberry";

/** utilities for documentation examples */

type ResultRow = [string, number[]];

/** get a webgpu device or report an error */
export function withGpuDevice(main: (device: GPUDevice) => any): void {
  labeledGpuDevice().then(main, noGPU);
}

/** display an error on screen */
export function renderError(msg: string): void {
  const app = appRoot();
  app.innerHTML = `
    <div style="display: flex; height: 100vh;">
      <div style="font:bold 24px sans-serif; 
                  color: red; 
                  margin: auto;"> 
        ${msg} 
      </div>
    </div>
  `;
}

/** Display an html table of rows starting with a string label followed by numeric values */
export function renderTable(results: Record<string, number[]>): void {
  const app = appRoot();
  const rows = Object.entries(results);

  const renderedRows = rows.map(renderRow).join("\n");

  app.innerHTML = `
    <table>
      ${renderedRows}
    </table>
  `;
}

function renderRow(resultRow: ResultRow): string {
  const [name, data] = resultRow;
  const dataColumns = numberColumns(data);
  return `<tr> <td style="width:8em">${name}</td> ${dataColumns} </tr>`;
}

function numberColumns(array: number[]): string {
  return array.map(s => `<td style="width:1.5em">${s}</td>`).join(" ");
}

function appRoot(): HTMLElement {
  return document.querySelector("#app") || document.querySelector("body")!;
}

function noGPU(): void {
  renderError("WebGPU not found. Try another browser?");
}
