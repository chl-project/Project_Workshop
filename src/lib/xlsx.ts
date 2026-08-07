import { triggerDownload } from './export'

/**
 * The workbook writer behind every Excel export in the app.
 *
 * The rule this module exists to enforce: a figure the app derived is never
 * written as a dead number. `Jumlah` goes out as `=D12*E12`, a subtotal as
 * `=SUM(F8:F14)`, a recap line as `=F20+F21`. The computed value rides along in
 * the cell as Excel's cached result, so the file opens showing the right figure
 * without a recalculation — but the recipient can click any cell and read the
 * arithmetic, and changing one input reprices everything downstream.
 *
 * That is the difference between a spreadsheet an estimator can audit and a
 * screenshot of one. A bill that arrives as flat numbers gets retyped into the
 * receiver's own model; a bill that carries its formulas gets checked.
 */

/** Accounting formats from the office's source workbook — keeps columns aligned. */
export const MONEY_FORMAT = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)'
export const QTY_FORMAT = '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)'
export const PERCENT_FORMAT = '0.0%'

/**
 * A cell holding a formula rather than a literal.
 *
 * `v` is the value the app already computed. Writing it as the cached result
 * means the number is correct the moment the file opens, and stays correct
 * after Excel recalculates — the two are the same arithmetic.
 */
export interface FormulaCell {
  /** A1-style formula *without* the leading `=`, e.g. `D12*J12`. */
  f: string
  /** The computed result, cached so the file reads correctly before a recalc. */
  v?: number
  /** Number format; falls back to the sheet's column format. */
  z?: string
}

export type Cell = string | number | FormulaCell | null | undefined

export const isFormula = (cell: Cell): cell is FormulaCell =>
  typeof cell === 'object' && cell !== null && typeof (cell as FormulaCell).f === 'string'

/** Builds a formula cell. `value` is what the app computed for the same sum. */
export const formula = (f: string, value?: number, z?: string): FormulaCell => ({ f, v: value, z })

/* ----------------------------------------------------------- cell addresses */

/** Zero-based column index to its Excel letter: 0 -> "A", 26 -> "AA". */
export function columnLetter(col: number): string {
  let letter = ''
  let n = col
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return letter
}

/** Zero-based (col, row) to an A1 reference: `ref(3, 11)` -> "D12". */
export const ref = (col: number, row: number): string => `${columnLetter(col)}${row + 1}`

/** Zero-based vertical span to an A1 range: `span(10, 7, 14)` -> "K8:K15". */
export const span = (col: number, firstRow: number, lastRow: number): string =>
  `${ref(col, firstRow)}:${ref(col, lastRow)}`

/** `=SUM(...)` over a vertical run. Text and blanks in the range are ignored. */
export const sumRange = (col: number, firstRow: number, lastRow: number, value?: number) =>
  formula(`SUM(${span(col, firstRow, lastRow)})`, value)

/** `=SUM(E12:I12)` — across the columns of one row, for a built-up rate. */
export const sumAcross = (firstCol: number, lastCol: number, row: number, value?: number) =>
  formula(`SUM(${ref(firstCol, row)}:${ref(lastCol, row)})`, value)

/** `=A1+A5+A9` — for totals over rows that are not next to each other. */
export const sumCells = (col: number, rows: number[], value?: number) =>
  formula(rows.map((r) => ref(col, r)).join('+'), value)

/* ------------------------------------------------------------------ sheets */

export interface SheetSpec {
  /** Tab name. Sanitised and truncated to Excel's 31-character limit. */
  name: string
  rows: Cell[][]
  /** Column widths in characters, left to right. */
  cols?: number[]
  /** Zero-based column indexes to tag with each accounting format. */
  formats?: { qty?: number[]; money?: number[]; percent?: number[] }
  /** Zero-based `[row, colStart, colEnd]` merges. */
  merges?: [number, number, number][]
}

/** Excel rejects `[]:*?/\` in a sheet name and caps it at 31 characters. */
const sheetName = (raw: string) => raw.replace(/[[\]:*?/\\]+/g, ' ').trim().slice(0, 31) || 'Sheet1'

/**
 * Writes the sheets to a real `.xlsx` and hands it to the browser.
 *
 * Formula cells are written after `aoa_to_sheet` rather than through it: the
 * array-of-arrays path is for literals, and assigning the cell object directly
 * is the one way to be sure the formula, its cached value and its number format
 * all land together.
 */
export async function downloadWorkbook(filename: string, sheets: SheetSpec[]): Promise<void> {
  const XLSX = await import('xlsx')
  const book = XLSX.utils.book_new()

  for (const spec of sheets) {
    // The cached value stands in for the formula in the literal grid, so the
    // sheet's used range covers the cell before the formula overwrites it.
    const literals = spec.rows.map((row) =>
      row.map((cell) => (isFormula(cell) ? (cell.v ?? 0) : (cell ?? null))),
    )
    const sheet = XLSX.utils.aoa_to_sheet(literals as unknown[][])

    spec.rows.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!isFormula(cell)) return
        sheet[XLSX.utils.encode_cell({ r, c })] = {
          t: 'n',
          f: cell.f,
          v: cell.v ?? 0,
          ...(cell.z ? { z: cell.z } : {}),
        }
      }),
    )

    if (spec.formats) applyFormats(XLSX, sheet, spec.formats)
    if (spec.cols) sheet['!cols'] = spec.cols.map((wch) => ({ wch }))
    if (spec.merges) {
      sheet['!merges'] = spec.merges.map(([r, c0, c1]) => ({ s: { r, c: c0 }, e: { r, c: c1 } }))
    }
    XLSX.utils.book_append_sheet(book, sheet, sheetName(spec.name))
  }

  const out = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  triggerDownload(
    new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${filename}.xlsx`,
  )
}

/**
 * Downloads a single-sheet workbook named `<filename>.xlsx`.
 *
 * `rows` may hold formula cells built with `formula`/`sumRange`/`sumCells`.
 * The title occupies row 1 and the headers row 3, so a caller addressing its
 * own rows offsets them by `HEADER_ROWS`.
 */
export const HEADER_ROWS = 3

export async function downloadExcel(
  filename: string,
  sheetTitle: string,
  headers: string[],
  rows: Cell[][],
  options: Omit<SheetSpec, 'name' | 'rows'> & { extraSheets?: SheetSpec[] } = {},
): Promise<void> {
  const { extraSheets = [], ...sheet } = options
  await downloadWorkbook(filename, [
    { ...sheet, name: sheetTitle, rows: [[sheetTitle], [], headers, ...rows] },
    ...extraSheets,
  ])
}

/** Tags the numeric columns with the workbook's accounting formats. */
function applyFormats(
  XLSX: typeof import('xlsx'),
  sheet: import('xlsx').WorkSheet,
  formats: NonNullable<SheetSpec['formats']>,
): void {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1')
  const pairs: [string, number[]][] = [
    [QTY_FORMAT, formats.qty ?? []],
    [MONEY_FORMAT, formats.money ?? []],
    [PERCENT_FORMAT, formats.percent ?? []],
  ]
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (const [format, cols] of pairs) {
      for (const c of cols) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })] as
          | { t?: string; z?: string }
          | undefined
        // A cell that carries its own format (a percentage inside a money
        // column) keeps it; only untagged numbers take the column default.
        if (cell && cell.t === 'n' && !cell.z) cell.z = format
      }
    }
  }
}

/* --------------------------------------------------------------- the legend */

/** One line of the "Rumus" sheet: a derived column and how it is arrived at. */
export interface FormulaNote {
  /** The column or row the rule applies to, e.g. "Jumlah Harga". */
  target: string
  /** The formula as it appears in the cells, e.g. "= Volume × Harga Satuan". */
  rule: string
  /** Why it is that, in a sentence a project manager reads once. */
  note?: string
}

/**
 * The sheet that says, in words, what every formula in the workbook does.
 *
 * The formulas are in the cells and can be read there; this sheet is for the
 * person who opens the file to check a number without hunting for it, and for
 * the printed copy where the formula bar does not exist.
 */
export function legendSheet(title: string, notes: FormulaNote[]): SheetSpec {
  const rows: Cell[][] = [
    ['RUMUS PERHITUNGAN'],
    [title],
    [],
    [
      'Setiap angka turunan di file ini ditulis sebagai formula Excel yang hidup, ' +
        'bukan angka mati.',
    ],
    ['Klik selnya untuk melihat perhitungannya; ubah angka masukan, seluruh total ikut berubah.'],
    [],
    ['Kolom / baris', 'Rumus', 'Keterangan'],
  ]
  for (const note of notes) rows.push([note.target, note.rule, note.note ?? null])
  return { name: 'Rumus', rows, cols: [30, 46, 68] }
}

/* ----------------------------------------------------------------- parsing */

/**
 * Reads an Indonesian-formatted figure back into a number.
 *
 * Several screens hold their figures as display strings ("1.840,00",
 * "Rp 531.300", "−601.500.000"). A formula cannot be built on a string, so the
 * export parses them back before writing — thousands are dots, the decimal is a
 * comma, and the minus may be the typographic U+2212.
 */
export function parseIdNumber(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (raw == null) return null

  const text = String(raw).replace(/−/g, '-').trim()
  const digits = text.replace(/[^\d.,-]/g, '')
  if (!/\d/.test(digits)) return null

  const negative = /^-/.test(digits) || /^\(.*\)$/.test(text)
  const value = Number(digits.replace(/-/g, '').replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(value)) return null
  return negative ? -value : value
}
