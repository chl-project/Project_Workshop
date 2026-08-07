import { printReport, triggerDownload } from './export'
import { formatIdr, formatQty } from './buildup'
import {
  downloadWorkbook,
  formula,
  isFormula,
  legendSheet,
  ref,
  sumAcross,
  sumRange,
  type Cell,
  type FormulaNote,
} from './xlsx'
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
 *
 * Every derived figure is a live formula. `Rate` is `=SUM(E12:I12)` across the
 * five build-up columns, `Amount` is `=D12*J12`, a section subtotal sums its own
 * item rows, the collection points at each section's subtotal cell, and the
 * grand total sums the collection. The recipient is a quantity surveyor who will
 * check the arithmetic before quoting off it; a bill of flat numbers gets
 * retyped into their own model, a bill that carries its formulas gets checked.
 */

/** Zero-based column positions in the bill — the formulas are written off these. */
const COL = {
  ref: 0,
  description: 1,
  unit: 2,
  qty: 3,
  supply: 4,
  accessories: 5,
  profit: 6,
  waste: 7,
  labour: 8,
  rate: 9,
  amount: 10,
} as const

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

/** Zero-based column positions in the unit-price analyses. */
const AHS = { no: 0, work: 1, item: 2, qty: 3, unit: 4, unitPrice: 5, total: 6 } as const

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

/**
 * The bill sheet, as rows of cells in the source workbook's column order.
 *
 * Rows are pushed in order, so `rows.length` is the index of the row about to
 * be written — that is what the formulas are addressed off. The cached value on
 * every formula is computed from the cells actually written, never from the
 * document's own total, so the figure Excel shows before a recalculation and
 * the figure it shows after one can never disagree.
 */
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

  const profitPct = doc.markup?.profitPct
  const wastePct = doc.markup?.wastePct

  /** Where each section's subtotal landed, so the collection can point at it. */
  const subtotalRows: (number | null)[] = []

  for (const section of doc.sections) {
    rows.push([section.ref, section.title])
    rows.push([])

    const firstLineRow = rows.length
    let written = 0
    let itemsTotal = 0

    for (const line of section.lines) {
      if (line.kind === 'heading') {
        rows.push([null, line.description])
        continue
      }
      const r = rows.length

      // Profit and waste are a percentage of the supply rate whenever the user
      // set one — written as `=E12*10%` so the percentage is visible in the
      // cell rather than baked into a number nobody can trace back.
      const pctCell = (pct: number | null | undefined, value: number | undefined) =>
        pct != null && line.supply != null
          ? formula(`${ref(COL.supply, r)}*${pct}%`, (line.supply * pct) / 100)
          : (value ?? null)

      // A line the model priced directly, with no build-up behind it, keeps its
      // rate as an input: summing five empty columns would zero it out.
      const built = [line.supply, line.accessories, line.profit, line.waste, line.labour].some(
        (v) => v != null,
      )
      const rateCell = built
        ? sumAcross(COL.supply, COL.labour, r, line.rate)
        : (line.rate ?? null)

      const amountCell =
        line.note != null
          ? line.note
          : line.qty != null && line.rate != null
            ? formula(`${ref(COL.qty, r)}*${ref(COL.rate, r)}`, line.qty * line.rate)
            : (line.amount ?? null)

      rows.push([
        null,
        line.description,
        line.unit ?? null,
        line.qty ?? null,
        line.supply ?? null,
        line.accessories ?? null,
        pctCell(profitPct, line.profit),
        pctCell(wastePct, line.waste),
        line.labour ?? null,
        rateCell,
        amountCell,
      ])

      if (isFormula(amountCell) || typeof amountCell === 'number') {
        written++
        itemsTotal += isFormula(amountCell) ? (amountCell.v ?? 0) : amountCell
      }
    }

    const lastLineRow = rows.length - 1
    rows.push([])

    // Sum the whole block: the heading rows inside it carry no amount, and a
    // line marked "Excluded" carries text — SUM steps over both.
    const subtotal =
      section.subtotalNote != null
        ? section.subtotalNote
        : written > 0
          ? sumRange(COL.amount, firstLineRow, lastLineRow, itemsTotal)
          : section.subtotal

    subtotalRows.push(section.subtotalNote == null && written > 0 ? rows.length : null)
    rows.push([
      null, null, null, null, null, null, null, null, null,
      `Subtotal ${titleCase(section.title)}`,
      subtotal,
    ])
    rows.push([])
  }

  rows.push([null, 'Collection'])
  const collectionFirst = rows.length
  let collectionTotal = 0

  doc.sections.forEach((section, i) => {
    const at = subtotalRows[i]
    const cell =
      section.subtotalNote != null
        ? section.subtotalNote
        : at != null
          ? formula(ref(COL.amount, at), section.subtotal)
          : section.subtotal
    if (typeof cell !== 'string') {
      collectionTotal += isFormula(cell) ? (cell.v ?? 0) : cell
    }
    rows.push([null, section.title, null, null, null, null, null, null, null, null, cell])
  })

  for (const prelim of doc.preliminaries) {
    collectionTotal += prelim.amount || 0
    rows.push([null, prelim.label, null, null, null, null, null, null, null, null, prelim.amount])
  }
  const collectionLast = rows.length - 1

  rows.push([])
  rows.push([
    null, null, null, null, null, null, null, null, null,
    doc.grandTotalLabel,
    collectionLast >= collectionFirst
      ? sumRange(COL.amount, collectionFirst, collectionLast, collectionTotal)
      : doc.grandTotal,
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

    const firstRow = rows.length
    let componentsTotal = 0

    for (const row of analysis.rows) {
      const r = rows.length
      const priced = row.qty != null && row.unitPrice != null
      const total = priced
        ? formula(`${ref(AHS.qty, r)}*${ref(AHS.unitPrice, r)}`, row.qty! * row.unitPrice!)
        : (row.total ?? null)
      if (priced) componentsTotal += row.qty! * row.unitPrice!
      else componentsTotal += row.total ?? 0

      rows.push([
        null,
        null,
        row.description,
        row.qty ?? null,
        row.unit ?? null,
        row.unitPrice ?? null,
        total,
      ])
    }

    const lastRow = rows.length - 1
    rows.push([
      null,
      null,
      'Jumlah',
      null,
      null,
      null,
      lastRow >= firstRow
        ? sumRange(AHS.total, firstRow, lastRow, componentsTotal)
        : analysis.total,
    ])
    rows.push([])
  }

  return rows
}

/** What the "Rumus" sheet says about the bill, in words. */
function formulaNotes(doc: BuildUpDoc): FormulaNote[] {
  const notes: FormulaNote[] = [
    {
      target: 'Rate (kolom J)',
      rule: '= SUM(Supply : Labour)',
      note: 'Supply PC + Accessories + Profit + Waste + Labour untuk baris yang sama.',
    },
    {
      target: 'Amount (kolom K)',
      rule: '= Qtty × Rate',
      note: 'Ubah volume atau salah satu komponen rate, seluruh bill ikut berubah.',
    },
    {
      target: 'Subtotal seksi',
      rule: '= SUM(Amount seluruh baris seksi)',
      note: 'Baris judul dan baris tanpa harga dilewati SUM dengan sendirinya.',
    },
    {
      target: 'Collection',
      rule: '= sel subtotal seksi yang bersangkutan',
      note: 'Referensi langsung — bukan salinan angka, jadi tidak bisa tertinggal versi.',
    },
    {
      target: doc.grandTotalLabel,
      rule: '= SUM(Collection)',
      note: 'Subtotal seluruh seksi ditambah preliminaries.',
    },
  ]

  if (doc.markup?.profitPct != null) {
    notes.push({
      target: 'Profit (kolom G)',
      rule: `= Supply PC Rate × ${doc.markup.profitPct}%`,
      note: 'Persentase ditulis di dalam sel, bukan dilebur ke angka.',
    })
  }
  if (doc.markup?.wastePct != null) {
    notes.push({
      target: 'Waste (kolom H)',
      rule: `= Supply PC Rate × ${doc.markup.wastePct}%`,
    })
  }
  if (doc.ahs.length > 0) {
    notes.push(
      { target: 'AHS — Total (kolom G)', rule: '= Vol. × Harga Satuan' },
      { target: 'AHS — Jumlah', rule: '= SUM(Total komponen analisa)' },
    )
  }
  if (doc.areaM2) {
    notes.push({
      target: 'Cost per m² (sheet Catatan)',
      rule: `= ${doc.grandTotalLabel} ÷ luas bangunan`,
      note: `Luas bangunan ${formatQty(doc.areaM2)} m².`,
    })
  }
  return notes
}

/**
 * The notes sheet.
 *
 * `billRef` is the bill sheet's name and the address of its grand total, so the
 * cost-per-m² line can be a cross-sheet formula rather than a number that goes
 * stale the moment a rate is edited on the other tab.
 */
function notesRows(doc: BuildUpDoc, billRef: { sheet: string; grandTotal: string }): Row[] {
  const rows: Row[] = [
    ['CATATAN & ASUMSI'],
    [],
    ['Proyek', doc.project],
    ['Lokasi', doc.location],
    ['Unit', doc.unit],
    ['Basis harga', doc.basis ?? '—'],
  ]

  const areaRow = rows.length
  rows.push(['Luas bangunan (m² total)', doc.areaM2 == null ? 'belum diisi' : doc.areaM2])
  rows.push([
    'Sumber luas',
    doc.areaM2 == null
      ? 'dokumen tidak memuat dimensi yang bisa diukur'
      : doc.areaSource === 'user'
        ? 'diisi manual'
        : `diukur AI dari gambar${doc.areaBreakdown?.length ? `: ${doc.areaBreakdown.join('; ')}` : ''}`,
  ])
  rows.push([
    `Cost per m² (${doc.currency})`,
    doc.areaM2
      ? formula(
          `'${billRef.sheet}'!${billRef.grandTotal}/${ref(1, areaRow)}`,
          doc.grandTotal / doc.areaM2,
        )
      : '—',
  ])

  rows.push(
    ['Sumber dokumen', doc.sources.join(', ')],
    ['Dibuat', new Date(doc.generatedAt).toLocaleString('id-ID')],
    ['Cara baca', doc.ocr ? 'OCR (dokumen hasil pindai)' : 'layer teks dokumen'],
    [],
    ['Volume dan harga di bawah ini disusun oleh AI dari dokumen yang diunggah.'],
    ['Angka bersifat estimasi awal dan wajib diverifikasi sebelum dipakai untuk penawaran.'],
    [],
    ['Asumsi yang dipakai'],
  )
  doc.assumptions.forEach((assumption, i) => rows.push([`${i + 1}.`, assumption]))

  const answered = doc.questions.filter((q) => q.answer)
  const open = doc.questions.filter((q) => !q.answer)

  if (answered.length > 0) {
    rows.push([], ['Data yang dikonfirmasi pengguna'])
    answered.forEach((q) => rows.push([q.question, `${q.answer}${q.unit ? ` ${q.unit}` : ''}`]))
  }
  if (open.length > 0) {
    rows.push([], ['Data yang masih kurang — angka di bawah ini masih berupa asumsi'])
    open.forEach((q) =>
      rows.push([q.question, `dampak ${q.impact} · diasumsikan: ${q.assumed || '—'}`]),
    )
  }
  return rows
}

/** Writes the workbook: bill, unit-price analyses, collection, and the notes. */
export async function exportBuildUpXlsx(doc: BuildUpDoc): Promise<void> {
  const bill = bqRows(doc)
  // The grand total is always the last row written; the notes sheet points its
  // cost-per-m² at that cell across the tabs.
  const billName = sheetName(doc.unit || 'BQ')
  const grandTotalCell = ref(COL.amount, bill.length - 1)

  await downloadWorkbook(baseName(doc), [
    {
      name: billName,
      rows: bill,
      formats: { qty: [COL.qty], money: [4, 5, 6, 7, 8, 9, 10] },
      cols: [8, 56, 8, 13, 16, 16, 14, 12, 14, 22, 20],
      merges: [[0, 0, 3]],
    },
    ...(doc.ahs.length > 0
      ? [
          {
            name: 'AHS',
            rows: ahsRows(doc),
            formats: { qty: [AHS.qty], money: [AHS.unitPrice, AHS.total] },
            cols: [6, 44, 38, 10, 8, 16, 18],
          },
        ]
      : []),
    {
      name: 'Catatan',
      rows: notesRows(doc, { sheet: billName, grandTotal: grandTotalCell }),
      cols: [26, 110],
    },
    legendSheet(`${doc.title} — ${doc.unit || doc.project}`, formulaNotes(doc)),
  ])
}

/** Excel rejects `[]:*?/\` in a sheet name and caps it at 31 characters. */
const sheetName = (raw: string) => raw.replace(/[[\]:*?/\\]+/g, ' ').trim().slice(0, 31) || 'BQ'

/* -------------------------------------------------------------------- csv */

/**
 * One flat table — what a cost engineer pastes straight into their own model.
 *
 * The formulas survive the trip: Excel and Google Sheets both parse a leading
 * `=` out of a CSV field, so the pasted bill recalculates rather than arriving
 * as a frozen column of numbers.
 */
export function exportBuildUpCsv(doc: BuildUpDoc): void {
  const quote = (v: Cell) => {
    const s = v == null ? '' : isFormula(v) ? `=${v.f}` : String(v)
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

  const answered = doc.questions.filter((q) => q.answer)
  const open = doc.questions.filter((q) => !q.answer)
  const qa =
    (answered.length
      ? `<h2>Data yang dikonfirmasi pengguna</h2><table>` +
        answered
          .map(
            (q) =>
              `<tr><td>${esc(q.question)}</td><td>${esc(q.answer ?? '')}${
                q.unit ? ` ${esc(q.unit)}` : ''
              }</td></tr>`,
          )
          .join('') +
        `</table>`
      : '') +
    (open.length
      ? `<h2>Data yang masih kurang</h2>` +
        `<div class="warn">Angka pada bagian yang disebut di bawah masih berupa asumsi.</div>` +
        `<table><tr><th>Pertanyaan</th><th>Dampak</th><th>Diasumsikan</th></tr>` +
        open
          .map(
            (q) =>
              `<tr><td>${esc(q.question)}</td><td class="c">${esc(q.impact)}</td>` +
              `<td>${esc(q.assumed || '—')}</td></tr>`,
          )
          .join('') +
        `</table>`
      : '')

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
      assumptions +
      qa,
  )
}

/** "EXTERNAL WORKS" -> "External Works", matching the bill's subtotal wording. */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
}
