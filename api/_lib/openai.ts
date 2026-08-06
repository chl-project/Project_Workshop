import OpenAI from 'openai'

/** Shared OpenAI helpers for the knowledge base and the chat assistant. */

export const CHAT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'
export const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small'
/**
 * Kept separate from CHAT_MODEL: OPENAI_MODEL may be set to a text-only model,
 * which would fail on the image payloads OCR sends.
 */
export const VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o'

export const OPENAI_MISSING_MESSAGE =
  'Fitur AI belum aktif. Tambahkan environment variable OPENAI_API_KEY di Vercel lalu redeploy.'

export function openai(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  return apiKey ? new OpenAI({ apiKey }) : null
}

/** Maps an OpenAI SDK error to a message that says what to fix. */
export function describeOpenAiError(err: unknown): string {
  const status = (err as { status?: number }).status
  if (status === 401) return 'OPENAI_API_KEY ditolak (401). Periksa kembali API key di Vercel.'
  if (status === 429) return 'Kuota / rate limit OpenAI terlampaui (429). Cek billing di dashboard OpenAI.'
  if (status === 404) return `Model tidak tersedia untuk akun ini. Sesuaikan OPENAI_MODEL.`
  return err instanceof Error ? err.message : 'Gagal memanggil OpenAI'
}

/**
 * Splits text into overlapping chunks on paragraph boundaries, so a retrieved
 * chunk keeps enough surrounding context to answer from.
 */
export function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim()
  if (clean.length <= size) return clean ? [clean] : []

  const chunks: string[] = []
  let start = 0
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length)
    if (end < clean.length) {
      // Prefer to break at a paragraph, then a sentence, then a space.
      const window = clean.slice(start, end)
      const brk = Math.max(
        window.lastIndexOf('\n\n'),
        window.lastIndexOf('. '),
        window.lastIndexOf('\n'),
      )
      if (brk > size * 0.5) end = start + brk + 1
    }
    const piece = clean.slice(start, end).trim()
    if (piece) chunks.push(piece)
    if (end >= clean.length) break
    start = Math.max(end - overlap, start + 1)
  }
  return chunks
}

/** Embeds a batch of texts. Batched to stay well inside request limits. */
export async function embedAll(client: OpenAI, texts: string[]): Promise<number[][]> {
  const out: number[][] = []
  const BATCH = 64
  for (let i = 0; i < texts.length; i += BATCH) {
    const res = await client.embeddings.create({
      model: EMBED_MODEL,
      input: texts.slice(i, i + BATCH),
    })
    out.push(...res.data.map((d) => d.embedding as number[]))
  }
  return out
}

/** Cosine similarity between two equal-length vectors. */
export function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length && i < b.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}
