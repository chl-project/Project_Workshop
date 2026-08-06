/**
 * Turns an uploaded file into something the model can read.
 *
 * A PDF exported from a CAD or office tool carries a text layer that can be
 * read directly. A scanned or photographed one carries only pixels, so its
 * pages are rendered to images and read by OCR instead — which is the common
 * case for an RKS that has been printed, signed, and scanned back in.
 *
 * Everything runs in the browser: heavy parsers (pdf.js, SheetJS) load lazily,
 * and rendering pages here keeps the file bytes off the server entirely.
 */

const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv', '.json', '.log', '.yml', '.yaml']
const SHEET_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.ods']
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

/** Longest edge of a rendered page, in pixels — legible to OCR without bloat. */
const RENDER_MAX_EDGE = 1600
/** Guards cost and request time on a long scanned document. */
export const MAX_OCR_PAGES = 30

export type ExtractResult =
  | { kind: 'text'; text: string }
  /** Pages that need OCR, as JPEG data URLs. */
  | { kind: 'images'; images: string[]; pages: number; truncated: boolean }

/** A positioned run of text on a PDF page. */
export interface PositionedText {
  str: string
  x: number
  y: number
  width: number
}

/** Vertical distance within which two runs count as the same visual row. */
const LINE_TOLERANCE = 3
/** Horizontal gap that reads as a column break rather than a word space. */
const COLUMN_GAP = 8

/**
 * Rebuilds rows and columns from positioned text runs.
 *
 * A PDF stores text as runs at coordinates, with no notion of a table. Reading
 * them in document order and joining with spaces flattens a material list into
 * one long line — "NO MATERIAL Brand 1.00 Atap Alderon 2.00 Plafond Yoshino" —
 * and the column each value belonged to is gone. Grouping by baseline and
 * marking wide gaps as column breaks keeps the table legible.
 */
export function layoutText(items: PositionedText[]): string {
  const usable = items.filter((i) => i.str.trim().length > 0)
  if (usable.length === 0) return ''

  const rows: { y: number; items: PositionedText[] }[] = []
  for (const item of usable) {
    const row = rows.find((r) => Math.abs(r.y - item.y) <= LINE_TOLERANCE)
    if (row) row.items.push(item)
    else rows.push({ y: item.y, items: [item] })
  }

  // PDF y grows upward, so the top of the page sorts last without this.
  rows.sort((a, b) => b.y - a.y)

  return rows
    .map((row) => {
      const sorted = [...row.items].sort((a, b) => a.x - b.x)
      let line = ''
      let cursorX: number | null = null
      for (const item of sorted) {
        if (cursorX !== null) line += item.x - cursorX > COLUMN_GAP ? ' | ' : ' '
        line += item.str.trim()
        cursorX = item.x + item.width
      }
      return line.replace(/[ \t]+/g, ' ').trim()
    })
    .filter(Boolean)
    .join('\n')
}

export function isSupportedFile(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    lower.endsWith('.pdf') ||
    SHEET_EXTENSIONS.some((ext) => lower.endsWith(ext)) ||
    IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext)) ||
    TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))
  )
}

export async function extractDocument(file: File): Promise<ExtractResult> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.pdf')) return extractPdf(file)
  if (SHEET_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return { kind: 'text', text: await extractSheetText(file) }
  }
  if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return { kind: 'images', images: [await fileToDataUrl(file)], pages: 1, truncated: false }
  }
  if (TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return { kind: 'text', text: await file.text() }
  }
  throw new Error(
    `Format ${file.name.split('.').pop() ?? ''} belum didukung. Gunakan PDF, gambar, XLSX/XLS, CSV, TXT, atau MD.`,
  )
}

/**
 * Reads a PDF's text layer, falling back to rendering its pages for OCR. The
 * threshold matters: a scanned PDF often carries a few stray characters from a
 * header stamp, which would otherwise pass as a successful text extraction and
 * yield almost nothing.
 */
async function extractPdf(file: File): Promise<ExtractResult> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const buffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) })
  const doc = await loadingTask.promise

  try {
    const pages: string[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      const positioned: PositionedText[] = content.items.flatMap((item) =>
        'str' in item
          ? [{ str: item.str, x: item.transform[4], y: item.transform[5], width: item.width }]
          : [],
      )
      const text = layoutText(positioned)
      if (text) pages.push(text)
    }

    const joined = pages.join('\n\n')
    // ~40 characters per page means there is no usable text layer.
    if (joined.length >= doc.numPages * 40) return { kind: 'text', text: joined }

    // Scanned or image-only: render the pages instead.
    const limit = Math.min(doc.numPages, MAX_OCR_PAGES)
    const images: string[] = []
    for (let n = 1; n <= limit; n++) {
      images.push(await renderPage(await doc.getPage(n)))
    }
    return {
      kind: 'images',
      images,
      pages: doc.numPages,
      truncated: doc.numPages > limit,
    }
  } finally {
    await loadingTask.destroy()
  }
}

/** Renders one PDF page to a JPEG data URL sized for OCR. */
async function renderPage(page: import('pdfjs-dist').PDFPageProxy): Promise<string> {
  const base = page.getViewport({ scale: 1 })
  const scale = Math.min(RENDER_MAX_EDGE / Math.max(base.width, base.height), 3)
  const viewport = page.getViewport({ scale: Math.max(scale, 1) })

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Browser tidak bisa merender halaman PDF.')
  // White background: a JPEG has no alpha, so transparent areas would go black.
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, canvas.width, canvas.height)

  await page.render({ canvasContext: context, viewport, canvas }).promise
  const url = canvas.toDataURL('image/jpeg', 0.82)
  canvas.width = 0
  canvas.height = 0
  return url
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`${file.name}: gagal dibaca.`))
    reader.readAsDataURL(file)
  })
}

/**
 * Renders every sheet as CSV. Keeping the row/column layout matters — the model
 * reads the header row to work out which column holds the spec, the volume, and
 * so on, which varies from one supplier's file to the next.
 */
async function extractSheetText(file: File): Promise<string> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { type: 'array' })

  const parts: string[] = []
  for (const name of book.SheetNames) {
    const sheet = book.Sheets[name]
    if (!sheet) continue
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim()
    if (csv) parts.push(`# Sheet: ${name}\n${csv}`)
  }

  const joined = parts.join('\n\n')
  if (!joined) throw new Error(`${file.name}: tidak ada data yang terbaca di dalam berkas.`)
  return joined
}
