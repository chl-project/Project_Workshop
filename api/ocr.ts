import type { VercelRequest, VercelResponse } from '@vercel/node'
import { allowCors } from './_lib/http.js'
import { describeOpenAiError, openai, OPENAI_MISSING_MESSAGE, VISION_MODEL } from './_lib/openai.js'

/**
 * Reads text off page images — a scanned RKS, a photographed material list, a
 * PDF that carries only pixels. The client renders pages and posts them here in
 * small batches; the transcript feeds the same downstream steps as a document
 * that already had a text layer.
 *
 *   POST /api/ocr  { images: [dataUrl, …], hint? } -> { text }
 */
export const config = { maxDuration: 60 }

/** Page images are large; a batch beyond this risks the request body limit. */
const MAX_IMAGES = 4

const SYSTEM_PROMPT = `Anda mesin OCR untuk dokumen konstruksi berbahasa Indonesia.

Salin ULANG seluruh teks yang terlihat pada gambar, seakurat mungkin.
- Pertahankan struktur tabel: satu baris tabel = satu baris teks, antar kolom dipisah " | ".
- Pertahankan nomor item, kode, satuan, dan angka persis seperti tertulis (termasuk koma desimal).
- Pertahankan judul, sub-judul, dan urutan pembacaan dari atas ke bawah.
- JANGAN merangkum, menafsirkan, menerjemahkan, atau menambah apa pun.
- Jika ada bagian yang tidak terbaca, tulis [tidak terbaca] di posisinya.
- Jika gambar bukan dokumen berisi teks (mis. foto lokasi atau denah tanpa tulisan),
  balas persis: [tidak ada teks]`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const client = openai()
  if (!client) return res.status(503).json({ configured: false, error: OPENAI_MISSING_MESSAGE })

  const body = (req.body ?? {}) as { images?: unknown; hint?: string }
  const images = Array.isArray(body.images)
    ? (body.images as unknown[]).filter(
        (v): v is string => typeof v === 'string' && v.startsWith('data:image/'),
      )
    : []
  if (images.length === 0) return res.status(400).json({ error: 'tidak ada gambar' })
  if (images.length > MAX_IMAGES) {
    return res.status(413).json({ error: `maksimum ${MAX_IMAGES} gambar per permintaan` })
  }

  try {
    const completion = await client.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text' as const,
              text: body.hint
                ? `Dokumen: ${body.hint}. Salin teks dari halaman berikut.`
                : 'Salin teks dari halaman berikut.',
            },
            ...images.map((url) => ({
              type: 'image_url' as const,
              image_url: { url, detail: 'high' as const },
            })),
          ],
        },
      ],
    })

    const text = (completion.choices[0]?.message?.content ?? '').trim()
    return res.status(200).json({
      configured: true,
      text: text === '[tidak ada teks]' ? '' : text,
    })
  } catch (err) {
    return res.status(502).json({ configured: true, error: describeOpenAiError(err) })
  }
}
