/**
 * Turns an uploaded file into plain text so it can be read by the model.
 *
 * Everything runs in the browser: heavy parsers (pdf.js, SheetJS) are imported
 * lazily so they stay out of the main bundle until someone uploads that kind of
 * file, and the file bytes never need a second round trip to the server.
 */

const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv', '.json', '.log', '.yml', '.yaml']
const SHEET_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.ods']

export function isSupportedFile(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    lower.endsWith('.pdf') ||
    SHEET_EXTENSIONS.some((ext) => lower.endsWith(ext)) ||
    TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))
  )
}

export async function extractText(file: File): Promise<string> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.pdf')) return extractPdfText(file)
  if (SHEET_EXTENSIONS.some((ext) => lower.endsWith(ext))) return extractSheetText(file)
  if (TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))) return file.text()
  throw new Error(
    `Format ${file.name.split('.').pop() ?? ''} belum didukung. Gunakan PDF, XLSX/XLS, CSV, TXT, atau MD.`,
  )
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const buffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) })
  const doc = await loadingTask.promise

  const pages: string[] = []
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (text) pages.push(text)
    }
  } finally {
    await loadingTask.destroy()
  }

  const joined = pages.join('\n\n')
  if (!joined.trim()) {
    throw new Error(
      'PDF ini tidak memuat teks yang bisa dibaca (kemungkinan hasil scan). ' +
        'Gunakan PDF hasil ekspor, atau salin teksnya secara manual.',
    )
  }
  return joined
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
