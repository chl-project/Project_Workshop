/**
 * Dependency-free client-side export helpers.
 *
 * `downloadExcel` writes an Excel-openable file (an HTML table with the
 * `application/vnd.ms-excel` MIME type — Excel and Google Sheets both import
 * it, keeping the visible number formatting). `printReport` opens a clean
 * print view the user saves as PDF via the browser's print dialog.
 */

const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Downloads `rows` as an Excel-openable file named `<filename>.xls`. */
export function downloadExcel(
  filename: string,
  sheetTitle: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const thead = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`
  const tbody = rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(String(c))}</td>`).join('')}</tr>`)
    .join('')
  const html =
    `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" />` +
    `<style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;` +
    `font-family:Arial,sans-serif;font-size:12px;text-align:left}th{background:#EFEFE8}</style></head>` +
    `<body><h3>${esc(sheetTitle)}</h3><table>${thead}${tbody}</table></body></html>`
  triggerDownload(new Blob([html], { type: 'application/vnd.ms-excel' }), `${filename}.xls`)
}

/**
 * Opens a print-ready window with the given inner HTML and invokes the print
 * dialog (Save as PDF). Falls back to a same-tab data URL if pop-ups are blocked.
 */
export function printReport(title: string, bodyHtml: string) {
  const doc =
    `<!doctype html><html lang="id"><head><meta charset="utf-8" /><title>${esc(title)}</title>` +
    `<style>` +
    `*{box-sizing:border-box}body{font-family:'IBM Plex Sans',Arial,sans-serif;color:#20221C;` +
    `margin:32px;font-size:12px}h1{font-size:18px;margin:0 0 4px}h2{font-size:13px;margin:20px 0 8px}` +
    `.meta{color:#6E7268;font-size:11px;margin-bottom:16px}` +
    `table{width:100%;border-collapse:collapse;margin:8px 0;font-size:11px}` +
    `th,td{border:1px solid #DCDCD3;padding:5px 8px;text-align:left}th{background:#EFEFE8}` +
    `td.num,th.num{text-align:right;font-family:'IBM Plex Mono',monospace}` +
    `@media print{body{margin:12mm}button{display:none}}` +
    `</style></head><body>${bodyHtml}` +
    `<script>window.onload=function(){window.print()}<\/script></body></html>`

  const w = window.open('', '_blank')
  if (w) {
    w.document.open()
    w.document.write(doc)
    w.document.close()
  } else {
    // Pop-up blocked — navigate current tab to a printable data URL.
    window.location.href = `data:text/html;charset=utf-8,${encodeURIComponent(doc)}`
  }
}

/** Builds an HTML `<table>` block for `printReport` from headers + rows. */
export function htmlTable(headers: string[], rows: string[][], numericCols: number[] = []) {
  const isNum = (i: number) => (numericCols.includes(i) ? ' class="num"' : '')
  const thead = `<tr>${headers.map((h, i) => `<th${isNum(i)}>${esc(h)}</th>`).join('')}</tr>`
  const tbody = rows
    .map((r) => `<tr>${r.map((c, i) => `<td${isNum(i)}>${esc(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<table>${thead}${tbody}</table>`
}
