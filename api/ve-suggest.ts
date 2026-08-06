import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import { allowCors } from './_lib/http.js'

/**
 * Generates Value-Engineering proposals with the OpenAI API. Reads
 * OPENAI_API_KEY; if it isn't configured, returns configured:false so the UI
 * can say exactly what to set rather than failing opaquely.
 *
 *   POST /api/ve-suggest  { projectId, context: string[] }  -> { suggestions: [...] }
 */

/** Override with OPENAI_MODEL if the account has access to a different model. */
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

const SYSTEM_PROMPT =
  'Anda insinyur Value Engineering (VE) konstruksi di Indonesia. Berikan usulan alternatif ' +
  'yang menurunkan biaya tanpa menabrak SNI, ringkas dan realistis. Jawab dalam Bahasa Indonesia. ' +
  'Balas HANYA dengan objek JSON berbentuk {"suggestions": [...]}, di mana tiap elemen punya field: ' +
  'item (string), change (string, "kondisi awal → usulan"), saving (string, perkiraan penghematan ' +
  'rupiah misalnya "Rp 120 jt"), note (string, opsional).'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      configured: false,
      error:
        'Fitur AI belum aktif. Tambahkan environment variable OPENAI_API_KEY di Vercel lalu redeploy.',
    })
  }

  const body = (req.body ?? {}) as { projectId?: string; context?: unknown }
  const context = Array.isArray(body.context) ? (body.context as string[]).slice(0, 40) : []

  try {
    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            `Proyek: ${body.projectId ?? '-'}\nItem pekerjaan pada estimasi saat ini:\n` +
            context.map((c, i) => `${i + 1}. ${c}`).join('\n') +
            '\n\nUsulkan 3–6 alternatif value engineering.',
        },
      ],
    })

    const text = completion.choices[0]?.message?.content ?? ''
    return res.status(200).json({ configured: true, suggestions: parseSuggestions(text) })
  } catch (err) {
    const status = typeof (err as { status?: number }).status === 'number'
      ? (err as { status: number }).status
      : undefined
    const message =
      status === 401
        ? 'OPENAI_API_KEY ditolak (401). Periksa kembali API key di Vercel.'
        : status === 429
          ? 'Kuota / rate limit OpenAI terlampaui (429). Cek billing di dashboard OpenAI.'
          : status === 404
            ? `Model "${MODEL}" tidak tersedia untuk akun ini. Set OPENAI_MODEL ke model yang Anda punya.`
            : err instanceof Error
              ? err.message
              : 'Gagal memanggil AI'
    return res.status(502).json({ configured: true, error: message })
  }
}

/** Reads the suggestion list out of the model's JSON reply, tolerating shapes. */
function parseSuggestions(text: string): unknown[] {
  if (!text.trim()) return []
  try {
    const parsed = JSON.parse(text) as unknown
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      // Accept {suggestions: [...]} and any single-array-valued object.
      if (Array.isArray(obj.suggestions)) return obj.suggestions
      const firstArray = Object.values(obj).find(Array.isArray)
      if (firstArray) return firstArray as unknown[]
    }
    return []
  } catch {
    return []
  }
}
