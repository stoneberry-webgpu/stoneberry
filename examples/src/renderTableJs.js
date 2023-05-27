
/** Display an html table of rows starting with a string label followed by numeric values */
export function renderTable(results) {
  const app = document.querySelector("div#app");
  const rows = Object.entries(results);

  const renderedRows = rows.map(renderRow).join("\n");

  app.innerHTML = `
    <table>
      ${renderedRows}
    </table>
  `;
}

function renderRow(resultRow) {
  const [name, data] = resultRow;
  const dataColumns = numberColumns(data);
  return `<tr> <td style="width:8em">${name}</td> ${dataColumns} </tr>`;
}

function numberColumns(array) {
  return array.map(s => `<td style="width:1.5em">${s}</td>`).join(" ");
}
