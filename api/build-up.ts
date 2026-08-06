import type { VercelRequest, VercelResponse } from '@vercel/node'
import { allowCors } from './_lib/http.js'
import { CHAT_MODEL, describeOpenAiError, openai, OPENAI_MISSING_MESSAGE } from './_lib/openai.js'

/**
 * Builds a bill of quantities out of an uploaded document.
 *
 * The input is whatever the user has: a drawing set exported from AutoCAD
 * (room names, levels, grid lines and dimensions in the text layer), an RKS, or
 * a supplier's spreadsheet. The output is always the same shape — the sectioned
 * bill the quantity surveyors here already work in, priced column by column
 * (supply, accessories, profit, waste, labour) so the rate can be audited
 * rather than taken on trust.
 *
 *   POST /api/build-up { projectName, filename, text, hint } -> { doc }
 */
export const config = { maxDuration: 300 }

/** Keeps a long drawing set inside one request. */
const MAX_CHARS = 90_000

const SYSTEM_PROMPT = `Anda quantity surveyor senior di Indonesia. Dari dokumen yang diberikan (gambar kerja hasil ekspor CAD/PDF, RKS, atau spreadsheet), susun Bill of Quantities lengkap dengan build up harga satuan.

Teks dokumen berasal dari layer teks PDF atau OCR. Baris dipisah baris baru, kolom dipisah " | ".
Dari gambar kerja Anda akan menemukan: nama ruang, peil lantai (FFL), grid kolom (A–E, 1–7), skala,
tipe unit, notasi material, tabel kusen/pintu/jendela, dan dimensi. Pakai itu untuk MENGUKUR:
perkirakan luas lantai per lantai dari grid dan skala, lalu turunkan volume pekerjaan secara wajar.

Balas HANYA satu objek JSON dengan bentuk berikut:

{
  "title": "BILL NO. 2 - BUILDING WORKS",
  "project": "nama proyek dari kop gambar",
  "location": "lokasi dari kop gambar",
  "unit": "tipe/unit yang dibilling, mis. UNIT 5X12 CORNER",
  "currency": "IDR",
  "areaM2": 0,
  "areaBreakdown": ["Lantai 1 — 34 m2 (dari denah)", "Lantai 2 — 34 m2 (dari denah)"],
  "sections": [
    {
      "ref": "A",
      "title": "PILING",
      "subtotalNote": "",
      "lines": [
        { "kind": "heading", "description": "Vibrated Reinforced in situ Concrete; Fc' 21 Mpa (K250)" },
        { "kind": "item", "description": "Pilecap", "unit": "m3", "qty": 3.672,
          "supply": 956250, "accessories": 0, "profit": 95625, "waste": 0, "labour": 0 }
      ]
    }
  ],
  "preliminaries": [{ "label": "Preliminaries", "amount": 12500000 }],
  "grandTotalLabel": "Total Amount Unit ...",
  "ahs": [
    { "no": 1, "title": "Pekerjaan Beton Ready Mix / m3",
      "rows": [
        { "description": "Ready Mix K-250 (FC '20)", "qty": 1, "unit": "m3", "unitPrice": 685000 },
        { "description": "Upah tukang", "qty": 1, "unit": "m3", "unitPrice": 171250 }
      ] }
  ],
  "assumptions": ["kalimat asumsi yang Anda pakai"],
  "questions": [
    { "id": "luas-bangunan", "question": "Berapa total luas lantai bangunan (semua lantai dijumlahkan)?",
      "affects": "cost per m2 dan seluruh volume arsitektur", "assumed": "belum diasumsikan",
      "impact": "tinggi", "kind": "number", "unit": "m2", "target": "areaM2" }
  ]
}

STRUKTUR SECTION — pakai urutan baku ini, buang yang memang tidak ada pekerjaannya:
A PILING · B EARTHWORK · C SUBSTRUCTURE · D STRUCTURE · E ARCHITECT · F MEP · G EXTERNAL WORKS
"ref" diisi huruf berurutan mulai "A". "title" HURUF BESAR, bahasa Inggris seperti contoh di atas.

BARIS:
- "kind":"heading" untuk baris judul kelompok tanpa harga (mis. "Formwork; as described in the
  specifications and drawings to:-", "Supply and install Reinforcement Bars; 420Mpa", "ROOF",
  "Staircase"). Isinya cukup "description".
- "kind":"item" untuk baris terukur. WAJIB ada "description", "unit", "qty", dan "supply".
- Pecah pekerjaan menjadi baris sedetail contoh: beton dipisah per elemen (pilecap, sloof, kolom,
  balok, plat lantai, ring balok), bekisting per elemen, pembesian per elemen — jangan digabung
  menjadi satu baris "pekerjaan struktur".
- Satuan yang lazim: m, m2, m3, kg, ttk (titik), unit, ls, no.
- Untuk pekerjaan yang dikerjakan di paket lain, pakai section dengan "subtotalNote" (mis.
  "include in building foundation") dan biarkan "lines" kosong.
- Untuk item yang tidak dihargai, isi "note":"Excluded" dan kosongkan qty/supply.

BUILD UP HARGA — ini inti menu ini:
- "supply"      harga material/beton/besi TERPASANG per satuan, pada basis harga yang
                diberikan di pesan pengguna. Pakai daftar harga acuan di sana sebagai patokan:
                item yang ada di daftar itu HARUS memakai angka tersebut (boleh menyesuaikan
                untuk spesifikasi yang jelas berbeda), dan item lain diperkirakan pada tingkat
                harga yang sama. JANGAN memakai harga tahun-tahun sebelumnya atau harga daerah
                lain — itu sumber utama estimasi yang kerendahan.
- "accessories" biaya aksesori/perekat/fixing per satuan; 0 kalau memang tidak ada.
- "profit"      overhead + profit. Pakai 10% dari "supply" secara konsisten kecuali dokumen
                menyebut angka lain.
- "waste"       susut material bila relevan; 0 kalau sudah termasuk di supply.
- "labour"      upah bila dipisah dari supply; 0 kalau supply sudah harga terpasang.
- JANGAN mengisi "rate" atau "amount" — server yang menghitungnya. Jangan mengisi subtotal
  atau total apa pun. Jangan pernah membalas angka hasil penjumlahan Anda sendiri.

AHS — sertakan 8–20 analisa harga satuan untuk pekerjaan pokok yang Anda pakai di atas
(beton ready mix per m3, pembesian per kg, bekisting per m2, pasangan bata ringan per m2,
plesteran, acian, pengecatan, keramik/homogenous tile, kusen, atap, dst). Tiap baris komponen
berisi bahan dan upah dengan koefisien yang wajar. Total tiap analisa harus konsisten dengan
"supply" yang Anda pakai di bill.

LUAS BANGUNAN ("areaM2") — sering salah, baca pelan-pelan:
- "areaM2" adalah TOTAL LUAS LANTAI BANGUNAN: luas pelat semua lantai dijumlahkan
  (lantai 1 + lantai 2 + mezanin/loteng bila ada). Bukan luas kavling, bukan luas
  tapak/footprint, bukan luas satu lantai saja.
- Ukur dari denah: pakai garis grid berdimensi, angka dimensi, atau skala gambar.
  Rinci per lantai di "areaBreakdown" supaya bisa diperiksa.
- JANGAN menurunkan luas dari nama tipe unit. "UNIT 5 X 12", "tipe 45/90", "kavling
  6x15" itu ukuran KAVLING atau kode tipe — mengalikannya (5 × 12 = 60, lalu × 2
  lantai = 120) adalah kesalahan yang paling sering terjadi dan hasilnya selalu
  terlalu besar, karena bangunan tidak menutupi seluruh kavling.
- Kalau gambar tidak memuat dimensi maupun skala yang bisa dipakai — misalnya teks
  yang terbaca hanya nama ruang dan peil lantai — JANGAN menebak. Isi "areaM2": null
  dan tulis di "assumptions" bahwa luas bangunan belum bisa diukur dari dokumen ini
  dan perlu diisi manual. Volume pekerjaan tetap Anda perkirakan seperti biasa.

UJI KEWAJARAN — lakukan sebelum membalas:
- Kalau "areaM2" berhasil diukur: hitung sendiri total bill ÷ luas itu, lalu bandingkan
  dengan rentang biaya per m² pada basis harga yang diberikan. Kalau hasilnya di BAWAH
  rentang untuk kelas bangunan ini, hampir selalu sebabnya ada lingkup yang belum masuk
  (MEP, finishing, atap, sanitair, pekerjaan persiapan) atau harga satuan yang ketinggalan
  zaman — periksa dan perbaiki dulu, jangan diserahkan apa adanya.
- Perbaikannya lewat LINGKUP dan harga satuan yang benar. JANGAN menaikkan harga satuan
  semata-mata supaya angkanya masuk rentang, dan jangan mengecilkan "areaM2" supaya biaya
  per m² kelihatan wajar — keduanya menyembunyikan masalah, bukan memperbaikinya.
- Bill hunian yang lengkap jarang punya kurang dari 60 baris item. Kalau punya Anda lebih
  sedikit, kemungkinan besar ada lingkup yang terlewat.

"questions" — DATA YANG MASIH KURANG. Ini sama pentingnya dengan bill-nya sendiri:
- Dokumen yang diunggah hampir tidak pernah memuat semua yang dibutuhkan untuk estimasi
  yang akurat. Untuk SETIAP hal yang Anda butuhkan tapi tidak ada di dokumen, dan yang
  kalau tebakannya meleset membuat total bergeser nyata, buat satu entri "questions".
- TETAP KELUARKAN BILL-NYA. Jangan menolak menghitung karena datanya kurang: pakai asumsi
  yang wajar, tulis asumsinya di "assumed", lalu tanyakan. Pengguna butuh angka hari ini.
- "impact" diisi seberapa jauh total bergeser kalau asumsi itu salah:
  "tinggi"  = menggeser total >10% (mis. luas bangunan, jumlah lantai, jenis pondasi,
              spesifikasi finishing, lingkup MEP)
  "sedang"  = 3–10% (mis. tebal plat, mutu beton, jenis penutup atap, tinggi plafon)
  "rendah"  = <3% (mis. merek cat, tipe fitting)
- Urutkan dari impact tertinggi. Maksimal 8 pertanyaan — pilih yang paling menentukan,
  jangan menanyakan hal yang bisa Anda baca sendiri dari dokumen.
- "kind": "number" kalau jawabannya angka (isi "unit"), "choice" kalau pilihan terbatas
  (isi "options"), selain itu "text".
- Kalau "areaM2" tidak bisa diukur, pertanyaan pertama WAJIB soal total luas lantai
  dengan "target": "areaM2".
- Bahasa Indonesia, kalimatnya untuk manajer proyek — bukan istilah internal model.
- Kalau dokumennya benar-benar lengkap, balas "questions": [].

Kalau pesan pengguna memuat bagian "JAWABAN DARI PENGGUNA", itu jawaban atas pertanyaan
Anda sebelumnya. Perlakukan sebagai FAKTA yang mengalahkan asumsi apa pun: pakai angkanya,
hitung ulang volume yang terpengaruh, hapus pertanyaan yang sudah terjawab dari "questions",
dan pindahkan yang sudah pasti dari "assumptions" ke keterangan biasa.

KEJUJURAN — bagian ini menentukan apakah hasilnya bisa dipakai:
- Volume dari gambar adalah PERKIRAAN. Tulis di "assumptions" setiap dasar ukur yang Anda pakai
  (mis. "luas lantai dasar 60 m2 diperkirakan dari grid 5x12 m", "tinggi lantai 3,675 m dari peil
  FFL", "tebal plat 120 mm diasumsikan karena tidak tertulis").
- Kalau dokumen tidak memuat suatu disiplin sama sekali (mis. tidak ada gambar MEP), tetap
  keluarkan sectionnya dengan estimasi kasar TAPI catat di "assumptions" bahwa itu allowance.
- JANGAN mengarang nama proyek, konsultan, atau lokasi yang tidak tertulis di dokumen —
  kosongkan saja.
- Jangan memasukkan baris kop gambar, nama konsultan, alamat, atau legenda sebagai item.

Jumlah baris item wajar: 60–150. Bahasa deskripsi mengikuti dokumen sumbernya.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const client = openai()
  if (!client) return res.status(503).json({ configured: false, error: OPENAI_MISSING_MESSAGE })

  const body = (req.body ?? {}) as {
    projectName?: string
    filename?: string
    text?: unknown
    hint?: string
    basis?: PriceBasis
    answers?: { question?: string; answer?: string }[]
  }
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return res.status(400).json({ error: 'teks dokumen kosong' })

  const answers = (Array.isArray(body.answers) ? body.answers : [])
    .map((a) => ({ question: str(a?.question), answer: str(a?.answer) }))
    .filter((a) => a.question && a.answer)

  const context = [
    `Nama proyek di aplikasi: ${body.projectName || '-'}`,
    `Nama berkas: ${body.filename || '-'}`,
    body.hint ? `Catatan dari pengguna: ${body.hint}` : '',
    '',
    describeBasis(body.basis),
    '',
    answers.length
      ? 'JAWABAN DARI PENGGUNA (fakta, mengalahkan asumsi):\n' +
        answers.map((a) => `- ${a.question}\n  jawab: ${a.answer}`).join('\n')
      : '',
    '',
    'Isi dokumen:',
    text.slice(0, MAX_CHARS),
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: context },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    const doc = parseDoc(raw, body.filename || 'dokumen')
    if (!doc) {
      return res
        .status(502)
        .json({ configured: true, error: 'AI tidak mengembalikan BQ yang bisa dibaca. Coba ulangi.' })
    }
    if (doc.sections.length === 0) {
      return res.status(200).json({
        configured: true,
        error:
          'Dokumen ini tidak memuat cukup informasi untuk menyusun BQ. Unggah gambar kerja ' +
          'dengan denah dan dimensi, atau BQ/spreadsheet yang sudah ada.',
      })
    }
    return res.status(200).json({ configured: true, doc })
  } catch (err) {
    return res.status(502).json({ configured: true, error: describeOpenAiError(err) })
  }
}

/* ------------------------------------------------------------ price basis */

interface PriceBasis {
  label?: string
  region?: string
  year?: number
  perM2Guide?: { klass?: string; from?: number; to?: number }[]
  anchorRates?: { item?: string; unit?: string; rate?: number }[]
}

const rp = (n: number) => n.toLocaleString('id-ID')

/**
 * Renders the app's price basis for the prompt.
 *
 * Without this the model prices from its own general sense of "harga
 * Indonesia", which reads as a national average from whenever its data ends —
 * consistently below current Jakarta rates. Anchoring the pokok items is what
 * keeps a generated bill in the right decade.
 */
function describeBasis(basis: PriceBasis | undefined): string {
  if (!basis || (!basis.anchorRates?.length && !basis.perM2Guide?.length)) return ''

  const lines = [`BASIS HARGA YANG WAJIB DIPAKAI: ${basis.label ?? 'basis aplikasi'}`]

  if (basis.perM2Guide?.length) {
    lines.push('', 'Rentang biaya bangun per m² (tanpa PPN, tanpa tanah) pada basis ini:')
    for (const g of basis.perM2Guide) {
      if (g.from == null || g.to == null) continue
      lines.push(`- ${g.klass ?? '-'}: Rp ${rp(g.from)} – Rp ${rp(g.to)} /m²`)
    }
  }

  if (basis.anchorRates?.length) {
    lines.push('', 'Harga satuan acuan (terpasang, sebelum overhead & profit):')
    for (const a of basis.anchorRates) {
      if (a.rate == null) continue
      lines.push(`- ${a.item ?? '-'} — Rp ${rp(a.rate)} /${a.unit ?? 'ls'}`)
    }
  }

  return lines.join('\n')
}

/* ------------------------------------------------------------- validation */

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Accepts a number or a numeric string; anything else reads as absent. */
function num(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'string') {
    // The model sometimes formats figures ("1.051.875" / "3,672"); read both.
    const cleaned = v.replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) && cleaned !== '' ? parsed : undefined
  }
  return undefined
}

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

const IMPACTS = new Set(['tinggi', 'sedang', 'rendah'])
const KINDS = new Set(['number', 'text', 'choice'])
const IMPACT_ORDER: Record<string, number> = { tinggi: 0, sedang: 1, rendah: 2 }
/** Enough to be useful; more than this and nobody answers any of them. */
const MAX_QUESTIONS = 8

/** Validates the data gaps, highest-impact first. */
function parseQuestions(raw: unknown): Record<string, unknown>[] {
  const seen = new Set<string>()

  return asArray(raw)
    .filter((q): q is Record<string, unknown> => Boolean(q) && typeof q === 'object')
    .map((q, i) => {
      const kind = KINDS.has(str(q.kind)) ? str(q.kind) : 'text'
      const options = asArray(q.options).map(str).filter(Boolean)
      return {
        id: str(q.id) || `q${i + 1}`,
        question: str(q.question),
        affects: str(q.affects),
        assumed: str(q.assumed),
        impact: IMPACTS.has(str(q.impact)) ? str(q.impact) : 'sedang',
        // A choice with nothing to choose from is just a text box.
        kind: kind === 'choice' && options.length < 2 ? 'text' : kind,
        unit: str(q.unit) || undefined,
        options: options.length >= 2 ? options : undefined,
        target: str(q.target) === 'areaM2' ? 'areaM2' : undefined,
      }
    })
    .filter((q) => {
      if (!q.question || seen.has(q.id)) return false
      seen.add(q.id)
      return true
    })
    .sort((a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact])
    .slice(0, MAX_QUESTIONS)
}

/**
 * Turns the model's reply into a document the client can render.
 *
 * Everything derived — rates, amounts, subtotals, totals — is left at zero
 * here; the client recomputes it from the inputs, which is also what happens
 * when the user changes the profit or waste percentage.
 */
function parseDoc(
  raw: string,
  filename: string,
): ({ sections: unknown[] } & Record<string, unknown>) | null {
  if (!raw.trim()) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const src = parsed as Record<string, unknown>

  const sections = asArray(src.sections)
    .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === 'object')
    .map((section, i) => {
      const lines = asArray(section.lines)
        .filter((l): l is Record<string, unknown> => Boolean(l) && typeof l === 'object')
        .map((line) => {
          const description = str(line.description)
          const qty = num(line.qty)
          const supply = num(line.supply)
          const note = str(line.note) || undefined
          const heading =
            str(line.kind) === 'heading' || (qty == null && supply == null && !note)
          if (heading) return { kind: 'heading' as const, description }

          // An unpriced item ("Excluded") keeps its columns empty rather than
          // reading as a genuine zero rate all the way down the row.
          const zeroed = supply == null ? undefined : 0
          return {
            kind: 'item' as const,
            description,
            unit: str(line.unit),
            qty,
            supply,
            accessories: num(line.accessories) ?? zeroed,
            profit: num(line.profit) ?? zeroed,
            waste: num(line.waste) ?? zeroed,
            labour: num(line.labour) ?? zeroed,
            note,
          }
        })
        .filter((line) => line.description.length > 0)

      return {
        ref: str(section.ref) || String.fromCharCode(65 + i),
        title: str(section.title) || `SECTION ${i + 1}`,
        subtotalNote: str(section.subtotalNote) || undefined,
        lines,
        subtotal: 0,
      }
    })
    .filter((section) => section.lines.length > 0 || section.subtotalNote)

  const ahs = asArray(src.ahs)
    .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === 'object')
    .map((analysis, i) => ({
      no: num(analysis.no) ?? i + 1,
      title: str(analysis.title),
      rows: asArray(analysis.rows)
        .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
        .map((row) => ({
          description: str(row.description),
          qty: num(row.qty),
          unit: str(row.unit),
          unitPrice: num(row.unitPrice),
        }))
        .filter((row) => row.description.length > 0),
      total: 0,
    }))
    .filter((analysis) => analysis.title.length > 0 && analysis.rows.length > 0)

  const preliminaries = asArray(src.preliminaries)
    .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object')
    .map((p) => ({ label: str(p.label) || 'Preliminaries', amount: num(p.amount) ?? 0 }))
    .filter((p) => p.amount > 0)

  const unit = str(src.unit)
  // A plot code the model may have multiplied out ("5 X 12" -> 120) is not a
  // floor area. Only keep a figure it also broke down per floor.
  const areaBreakdown = asArray(src.areaBreakdown).map(str).filter(Boolean)
  const areaM2 = areaBreakdown.length > 0 ? num(src.areaM2) : undefined

  return {
    title: str(src.title) || 'BILL OF QUANTITIES',
    project: str(src.project),
    location: str(src.location),
    unit,
    currency: str(src.currency) || 'IDR',
    areaM2,
    areaSource: areaM2 != null ? 'drawing' : undefined,
    areaBreakdown,
    sections,
    preliminaries,
    grandTotalLabel: str(src.grandTotalLabel) || `Total Amount ${unit}`.trim(),
    grandTotal: 0,
    ahs,
    assumptions: asArray(src.assumptions).map(str).filter(Boolean),
    questions: parseQuestions(src.questions),
    sources: [filename],
    generatedAt: new Date().toISOString(),
  }
}
