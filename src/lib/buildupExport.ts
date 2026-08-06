import { printReport, triggerDownload } from './export'
import { formatIdr, formatQty } from './buildup'
import type { BuildUpDoc } from '@/types'

/**
 * Exports the generated bill.
 *
 * The Excel file is a real `.xlsx` written with SheetJS, laid out column for
 * column like the bills this office already circulates — Ref / Description /
 * Unit / Qtty / the five build-up columns / Rate / Amount, section subtotals in
 * the Rate column, and a collection page at the end. That matters more than it
 * sounds: the file goes to a client who will open it next to last quarter's
 * bill, and a different column order makes the two impossible to compare.
 */

/** Accounting format from the source workbook — keeps the columns aligned. */
const MONEY = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)'
const QTY = '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)'

const BQ_HEADERS = [
  'Ref',
  'Description',
  'Unit',
  'Qtty',
  'Supply PC Rate',
  'Accessories Rate',
  'Profit',
  'Waste',
  'Labour',
  'Rate',
  'Amount',
]

type Cell = string | number | null
type Row = Cell[]

/** Filesystem-safe stem for the downloaded files. */
function baseName(doc: BuildUpDoc): string {
  const parts = [doc.project, doc.unit].filter(Boolean).join(' - ') || 'build-up-cost'
  return parts
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/* ------------------------------------------------------------------ excel */

/** The bill sheet, as rows of cells in the source workbook's column order. */
function bqRows(doc: BuildUpDoc): Row[] {
  const rows: Row[] = [
    [doc.project],
    [doc.location],
    [doc.unit],
    [doc.basis ? `Basis harga: ${doc.basis}` : null],
    BQ_HEADERS,
    [null, null, null, null, ...Array(7).fill(doc.currency)],
    [],
  ]

  for (const section of doc.sections) {
    rows.push([section.ref, section.title])
    rows.push([])
    for (const line of section.lines) {
      if (line.kind === 'heading') {
        rows.push([null, line.description])
        continue
      }
      rows.push([
        null,
        line.description,
        line.unit ?? null,
        line.qty ?? null,
        line.supply ?? null,
        line.accessories ?? null,
        line.profit ?? null,
        line.waste ?? null,
        line.labour ?? null,
        line.rate ?? null,
        line.note ?? line.amount ?? null,
      ])
    }
    rows.push([])
    rows.push([
      null, null, null, null, null, null, null, null, null,
      `Subtotal ${titleCase(section.title)}`,
      section.subtotalNote ?? section.subtotal,
    ])
    rows.push([])
  }

  rows.push([null, 'Collection'])
  for (const section of doc.sections) {
    rows.push([
      null, section.title, null, null, null, null, null, null, null, null,
      section.subtotalNote ?? section.subtotal,
    ])
  }
  for (const prelim of doc.preliminaries) {
    rows.push([null, prelim.label, null, null, null, null, null, null, null, null, prelim.amount])
  }
  rows.push([])
  rows.push([
    null, null, null, null, null, null, null, null, null,
    doc.grandTotalLabel,
    doc.grandTotal,
  ])

  return rows
}

function ahsRows(doc: BuildUpDoc): Row[] {
  const rows: Row[] = [
    ['ANALISA HARGA SATUAN'],
    [doc.project],
    [doc.unit],
    [],
    ['No.', 'Jenis Pekerjaan', 'Uraian', 'Vol.', 'Sat.', 'Harga Satuan', 'Total'],
    [null, null, null, null, null, doc.currency, doc.currency],
    [],
  ]

  for (const analysis of doc.ahs) {
    rows.push([analysis.no, analysis.title])
    for (const row of analysis.rows) {
      rows.push([
        null,
        null,
        row.description,
        row.qty ?? null,
        row.unit ?? null,
        row.unitPrice ?? null,
        row.total ?? null,
      ])
    }
    rows.push([null, null, 'Jumlah', null, null, null, analysis.total])
    rows.push([])
  }

  return rows
}

function notesRows(doc: BuildUpDoc): Row[] {
  const rows: Row[] = [
    ['CATATAN & ASUMSI'],
    [],
    ['Proyek', doc.project],
    ['Lokasi', doc.location],
    ['Unit', doc.unit],
    ['Basis harga', doc.basis ?? '—'],
    ['Luas bangunan', doc.areaM2 == null ? 'belum diisi' : `${formatQty(doc.areaM2)} m² total`],
    [
      'Sumber luas',
      doc.areaM2 == null
        ? 'dokumen tidak memuat dimensi yang bisa diukur'
        : doc.areaSource === 'user'
          ? 'diisi manual'
          : `diukur AI dari gambar${doc.areaBreakdown?.length ? `: ${doc.areaBreakdown.join('; ')}` : ''}`,
    ],
    [
      'Cost per m²',
      doc.areaM2 ? `${doc.currency} ${formatIdr(doc.grandTotal / doc.areaM2)}` : '—',
    ],
    ['Sumber dokumen', doc.sources.join(', ')],
    ['Dibuat', new Date(doc.generatedAt).toLocaleString('id-ID')],
    ['Cara baca', doc.ocr ? 'OCR (dokumen hasil pindai)' : 'layer teks dokumen'],
    [],
    ['Volume dan harga di bawah ini disusun oleh AI dari dokumen yang diunggah.'],
    ['Angka bersifat estimasi awal dan wajib diverifikasi sebelum dipakai untuk penawaran.'],
    [],
    ['Asumsi yang dipakai'],
  ]
  doc.assumptions.forEach((assumption, i) => rows.push([`${i + 1}.`, assumption]))
  return rows
}

/** Writes the workbook: bill, unit-price analyses, collection, and the notes. */
export async function exportBuildUpXlsx(doc: BuildUpDoc): Promise<void> {
  const XLSX = await import('xlsx')
  const book = XLSX.utils.book_new()

  const bill = XLSX.utils.aoa_to_sheet(bqRows(doc) as unknown[][])
  applyFormats(XLSX, bill, { qty: [3], money: [4, 5, 6, 7, 8, 9, 10] })
  bill['!cols'] = [
    { wch: 8 }, { wch: 56 }, { wch: 8 }, { wch: 13 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
    { wch: 22 }, { wch: 20 },
  ]
  bill['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }]
  XLSX.utils.book_append_sheet(book, bill, sheetName(doc.unit || 'BQ'))

  if (doc.ahs.length > 0) {
    const ahs = XLSX.utils.aoa_to_sheet(ahsRows(doc) as unknown[][])
    applyFormats(XLSX, ahs, { qty: [3], money: [5, 6] })
    ahs['!cols'] = [
      { wch: 6 }, { wch: 44 }, { wch: 38 }, { wch: 10 }, { wch: 8 }, { wch: 16 }, { wch: 18 },
    ]
    XLSX.utils.book_append_sheet(book, ahs, 'AHS')
  }

  const notes = XLSX.utils.aoa_to_sheet(notesRows(doc) as unknown[][])
  notes['!cols'] = [{ wch: 18 }, { wch: 110 }]
  XLSX.utils.book_append_sheet(book, notes, 'Catatan')

  const out = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  triggerDownload(
    new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${baseName(doc)}.xlsx`,
  )
}

/** Excel rejects `[]:*?/\` in a sheet name and caps it at 31 characters. */
const sheetName = (raw: string) => raw.replace(/[[\]:*?/\\]+/g, ' ').trim().slice(0, 31) || 'BQ'

/** Tags the numeric columns with the workbook's accounting formats. */
function applyFormats(
  XLSX: typeof import('xlsx'),
  sheet: import('xlsx').WorkSheet,
  columns: { qty: number[]; money: number[] },
): void {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1')
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (const [format, cols] of [
      [QTY, columns.qty],
      [MONEY, columns.money],
    ] as const) {
      for (const c of cols) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })] as
          | { t?: string; z?: string }
          | undefined
        if (cell && cell.t === 'n') cell.z = format
      }
    }
  }
}

/* -------------------------------------------------------------------- csv */

/** One flat table — what a cost engineer pastes straight into their own model. */
export function exportBuildUpCsv(doc: BuildUpDoc): void {
  const quote = (v: Cell) => {
    const s = v == null ? '' : String(v)
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = bqRows(doc).map((row) => row.map(quote).join(';'))
  // A BOM makes Excel on a Windows machine read the file as UTF-8.
  triggerDownload(
    new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }),
    `${baseName(doc)}.csv`,
  )
}

/* ------------------------------------------------------------------- json */

/** The document as stored — for re-import or for another tool to read. */
export function exportBuildUpJson(doc: BuildUpDoc): void {
  triggerDownload(
    new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }),
    `${baseName(doc)}.json`,
  )
}

/* -------------------------------------------------------------------- pdf */

const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Opens the print view the user saves as PDF. */
export function exportBuildUpPdf(doc: BuildUpDoc): void {
  const money = (v: number | undefined) => esc(formatIdr(v))

  const sections = doc.sections
    .map((section) => {
      const body = section.lines
        .map((line) => {
          if (line.kind === 'heading') {
            return `<tr class="head"><td colspan="7">${esc(line.description)}</td></tr>`
          }
          return (
            `<tr><td>${esc(line.description)}</td>` +
            `<td class="c">${esc(line.unit ?? '')}</td>` +
            `<td class="num">${esc(formatQty(line.qty))}</td>` +
            `<td class="num">${money(line.supply)}</td>` +
            `<td class="num">${money(line.profit)}</td>` +
            `<td class="num">${money(line.rate)}</td>` +
            `<td class="num">${line.note ? esc(line.note) : money(line.amount)}</td></tr>`
          )
        })
        .join('')

      const subtotal = section.subtotalNote
        ? esc(section.subtotalNote)
        : money(section.subtotal)

      // A section priced elsewhere carries no items; its column header would
      // sit above nothing.
      const header = section.lines.length
        ? `<tr><th>Description</th><th class="c">Unit</th><th class="num">Qtty</th>` +
          `<th class="num">Supply</th><th class="num">Profit</th><th class="num">Rate</th>` +
          `<th class="num">Amount</th></tr>`
        : ''

      return (
        `<h2>${esc(section.ref)} &nbsp; ${esc(section.title)}</h2>` +
        `<table>${header}${body}` +
        `<tr class="sub"><td colspan="6">Subtotal ${esc(titleCase(section.title))}</td>` +
        `<td class="num">${subtotal}</td></tr></table>`
      )
    })
    .join('')

  const collection =
    `<h2>Collection</h2><table>` +
    doc.sections
      .map(
        (s) =>
          `<tr><td>${esc(s.title)}</td><td class="num">${
            s.subtotalNote ? esc(s.subtotalNote) : money(s.subtotal)
          }</td></tr>`,
      )
      .join('') +
    doc.preliminaries
      .map((p) => `<tr><td>${esc(p.label)}</td><td class="num">${money(p.amount)}</td></tr>`)
      .join('') +
    `<tr class="sub"><td>${esc(doc.grandTotalLabel)}</td>` +
    `<td class="num">${money(doc.grandTotal)}</td></tr></table>`

  const ahs = doc.ahs.length
    ? `<h2>Analisa Harga Satuan</h2>` +
      doc.ahs
        .map(
          (a) =>
            `<table><tr><th colspan="4">${esc(String(a.no))}. ${esc(a.title)}</th></tr>` +
            a.rows
              .map(
                (r) =>
                  `<tr><td>${esc(r.description)}</td><td class="num">${esc(formatQty(r.qty))}</td>` +
                  `<td class="c">${esc(r.unit ?? '')}</td>` +
                  `<td class="num">${money(r.total)}</td></tr>`,
              )
              .join('') +
            `<tr class="sub"><td colspan="3">Jumlah</td><td class="num">${money(a.total)}</td></tr></table>`,
        )
        .join('')
    : ''

  const assumptions = doc.assumptions.length
    ? `<h2>Asumsi</h2><ol>${doc.assumptions.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>`
    : ''

  const head =
    `<h1>${esc(doc.title)}</h1>` +
    `<div class="meta">${esc([doc.project, doc.location, doc.unit].filter(Boolean).join(' · '))}<br />` +
    `Basis harga: ${esc(doc.basis ?? '—')} · ` +
    `luas bangunan: ${doc.areaM2 == null ? 'belum diisi' : `${esc(formatQty(doc.areaM2))} m²`}` +
    (doc.areaM2 ? ` · ${esc(formatIdr(doc.grandTotal / doc.areaM2))} /m²` : '') +
    `<br />` +
    `Sumber: ${esc(doc.sources.join(', ') || '-')} · ` +
    `dibuat ${esc(new Date(doc.generatedAt).toLocaleString('id-ID'))}</div>` +
    `<div class="warn">Volume dan harga disusun oleh AI dari dokumen yang diunggah. ` +
    `Angka bersifat estimasi awal dan wajib diverifikasi sebelum dipakai untuk penawaran.</div>`

  printReport(
    `${doc.title} — ${doc.unit || doc.project}`,
    `<style>` +
      `h2{border-bottom:1px solid #DCDCD3;padding-bottom:4px}` +
      `tr.head td{font-weight:600;background:#FAFAF6}` +
      `tr.sub td{font-weight:600;background:#F2F4EA}` +
      `td.c,th.c{text-align:center}` +
      `.warn{background:#F6F3E8;border:1px solid #E4DCC0;border-radius:6px;padding:8px 10px;` +
      `font-size:11px;margin-bottom:14px}` +
      `ol{font-size:11px;line-height:1.7;padding-left:18px}` +
      `</style>` +
      head +
      collection +
      sections +
      ahs +
      assumptions,
  )
}

/** "EXTERNAL WORKS" -> "External Works", matching the bill's subtotal wording. */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
}
