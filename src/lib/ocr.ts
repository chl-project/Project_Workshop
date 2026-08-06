import { extractDocument, MAX_OCR_PAGES } from './extract'

/**
 * Reads a document to text, running OCR when it has no text layer.
 *
 * Page images are far too large to post in one request, so they go up a few at
 * a time and the transcripts are joined. Progress is reported per batch because
 * a scanned RKS can take a while and a silent button looks broken.
 */

/** Pages per request — matches the server's cap and stays inside the body limit. */
const BATCH = 3

export interface ReadResult {
  text: string
  /** True when the text came from OCR rather than an embedded text layer. */
  ocr: boolean
  /** Set when the document was longer than the page cap. */
  note?: string
}

async function ocrBatch(images: string[], hint: string): Promise<string> {
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, hint }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `OCR gagal (${res.status})`)
  }
  const body = (await res.json()) as { text?: string }
  return body.text ?? ''
}

export async function readDocument(
  file: File,
  onProgress?: (message: string) => void,
): Promise<ReadResult> {
  onProgress?.(`Membaca ${file.name}…`)
  const extracted = await extractDocument(file)

  if (extracted.kind === 'text') {
    if (!extracted.text.trim()) throw new Error(`${file.name}: tidak ada teks yang terbaca.`)
    return { text: extracted.text, ocr: false }
  }

  const { images, pages, truncated } = extracted
  const parts: string[] = []
  for (let i = 0; i < images.length; i += BATCH) {
    const batch = images.slice(i, i + BATCH)
    const from = i + 1
    const to = Math.min(i + batch.length, images.length)
    onProgress?.(`Memindai ${file.name} — halaman ${from}–${to} dari ${images.length}…`)
    const text = await ocrBatch(batch, file.name)
    if (text.trim()) parts.push(text.trim())
  }

  const text = parts.join('\n\n')
  if (!text.trim()) {
    throw new Error(
      `${file.name}: tidak ada teks yang terbaca dari hasil pindai. ` +
        'Pastikan tulisannya jelas dan tidak miring, atau unggah versi digitalnya.',
    )
  }

  return {
    text,
    ocr: true,
    note: truncated
      ? `hanya ${MAX_OCR_PAGES} halaman pertama dari ${pages} yang dipindai`
      : undefined,
  }
}
