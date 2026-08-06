import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { allowCors } from './_lib/http.js'

/**
 * Generates Value-Engineering proposals with Claude. Uses ANTHROPIC_API_KEY;
 * if it isn't configured, returns configured:false so the UI can tell the user
 * exactly what to set rather than failing opaquely.
 *
 *   POST /api/ve-suggest  { projectId, context: string[] }  -> { suggestions: [...] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      configured: false,
      error:
        'Fitur AI belum aktif. Tambahkan environment variable ANTHROPIC_API_KEY di Vercel (Anthropic API key) lalu redeploy.',
    })
  }

  const body = (req.body ?? {}) as { projectId?: string; context?: unknown }
  const context = Array.isArray(body.context) ? (body.context as string[]).slice(0, 40) : []

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2048,
      output_config: { effort: 'low' },
      system:
        'Anda insinyur Value Engineering (VE) konstruksi di Indonesia. Berikan usulan alternatif ' +
        'yang menurunkan biaya tanpa menabrak SNI, ringkas dan realistis. Jawab HANYA dengan JSON ' +
        'array of objects dengan field: item (string), change (string, kondisi awal → usulan), ' +
        'saving (string, perkiraan penghematan dalam rupiah, mis. "Rp 120 jt"), note (string opsional). ' +
        'Tanpa teks lain, tanpa code fence.',
      messages: [
        {
          role: 'user',
          content:
            `Proyek: ${body.projectId ?? '-'}\nItem pekerjaan pada estimasi saat ini:\n` +
            context.map((c, i) => `${i + 1}. ${c}`).join('\n') +
            `\n\nUsulkan 3–6 alternatif value engineering dalam Bahasa Indonesia.`,
        },
      ],
    })

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    return res.status(200).json({ configured: true, suggestions: parseSuggestions(text) })
  } catch (err) {
    return res.status(502).json({
      configured: true,
      error: err instanceof Error ? err.message : 'Gagal memanggil AI',
    })
  }
}

/** Extracts a JSON array from the model's reply, tolerating stray code fences. */
function parseSuggestions(text: string): unknown[] {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1) return []
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
