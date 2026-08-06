import type { VercelRequest, VercelResponse } from '@vercel/node'
import { allowCors } from './_lib/http.js'
import { CHAT_MODEL, describeOpenAiError, openai, OPENAI_MISSING_MESSAGE } from './_lib/openai.js'

/**
 * Reads material rows out of an uploaded document.
 *
 * Source files vary a lot — a supplier's spreadsheet, an RKS chapter, a
 * scanned-then-exported material list — so the columns, wording, and units are
 * never the same twice. Rather than pattern-matching each layout, the text is
 * handed to the model with the target schema and it maps whatever it finds.
 *
 *   POST /api/extract-materials { filename, text } -> { materials: [...] }
 */
export const config = { maxDuration: 60 }

/** Keeps a long RKS inside one request; the client splits anything larger. */
const MAX_CHARS = 60_000

const SYSTEM_PROMPT = `Anda asisten quantity surveyor. Dari teks dokumen konstruksi, tarik daftar material/pekerjaan menjadi data terstruktur.

Balas HANYA objek JSON: {"materials": [...]}. Tiap elemen:
- division  (string) Divisi pekerjaan. Pilih yang paling sesuai: "Struktur", "Arsitektur", "MEP", "Interior", "Lansekap". Jika benar-benar tidak jelas, pakai "Lainnya".
- item      (string) Nama material/pekerjaan, ringkas. WAJIB ada.
- spec      (string) Spesifikasi teknis apa adanya dari dokumen. Kosongkan "" jika tidak disebut.
- standard  (string) Rujukan standar bila disebut, mis. "SNI 2847:2019". Kosongkan "" jika tidak ada.
- volume    (string) Volume beserta satuan, mis. "412,60 m³". Kosongkan "" jika tidak ada.
- status    (string) Salah satu: "clear", "ambiguous", "overspec", "unavailable".

Aturan penilaian status:
- "clear"       : spesifikasi jelas dan terukur.
- "ambiguous"   : spesifikasi kabur/subjektif (mis. "kualitas baik", tanpa tipe/merek/ukuran).
- "overspec"    : jelas tapi berlebihan untuk kelas proyek (mis. motif custom, impor khusus).
- "unavailable" : menyebut barang yang tampak sudah tidak diproduksi / tidak tersedia.

Aturan umum:
- Ambil HANYA yang benar-benar tertulis. JANGAN mengarang item, volume, atau standar.
- Jangan masukkan baris header tabel, subtotal, atau keterangan umum sebagai item.
- Pertahankan format angka Indonesia apa adanya (koma desimal).
- Jika dokumen tidak memuat daftar material sama sekali, balas {"materials": []}.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const client = openai()
  if (!client) return res.status(503).json({ configured: false, error: OPENAI_MISSING_MESSAGE })

  const body = (req.body ?? {}) as { filename?: string; text?: unknown }
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return res.status(400).json({ error: 'teks kosong' })

  try {
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Nama berkas: ${body.filename ?? '-'}\n\nIsi dokumen:\n${text.slice(0, MAX_CHARS)}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    return res.status(200).json({ configured: true, materials: parseMaterials(raw) })
  } catch (err) {
    return res.status(502).json({ configured: true, error: describeOpenAiError(err) })
  }
}

const STATUSES = new Set(['clear', 'ambiguous', 'overspec', 'unavailable'])

/** Validates the model's reply, dropping anything that isn't a usable row. */
function parseMaterials(raw: string): unknown[] {
  if (!raw.trim()) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? ((parsed as Record<string, unknown>).materials ??
        Object.values(parsed as Record<string, unknown>).find(Array.isArray))
      : undefined
  if (!Array.isArray(list)) return []

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

  return list
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => ({
      division: str(row.division) || 'Lainnya',
      item: str(row.item),
      spec: str(row.spec),
      standard: str(row.standard),
      volume: str(row.volume),
      status: STATUSES.has(str(row.status)) ? str(row.status) : 'clear',
    }))
    .filter((row) => row.item.length > 0)
}
