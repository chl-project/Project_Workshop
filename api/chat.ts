import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db, ensureSchema } from './_lib/db.js'
import { allowCors } from './_lib/http.js'
import {
  CHAT_MODEL,
  cosine,
  describeOpenAiError,
  EMBED_MODEL,
  openai,
  OPENAI_MISSING_MESSAGE,
} from './_lib/openai.js'

/**
 * RAG assistant. Answers from two sources at once: the uploaded knowledge base
 * (semantic search over embedded chunks) and the project's own figures held in
 * the `store` table, so questions like "berapa total RAB?" are answered from
 * live app data rather than the documents.
 *
 *   POST /api/chat  { projectId, messages: [{role, content}] }
 *        -> { answer, sources: [{title, snippet}], usedProjectData }
 */

/** Retrieval plus a chat completion can take a while on a big knowledge base. */
export const config = { maxDuration: 60 }

/** How many knowledge chunks to put in front of the model. */
const TOP_K = 6
/** Upper bound on rows scored per question — plenty for a workshop knowledge base. */
const MAX_CHUNKS_SCANNED = 4000
/** Characters of app data to include, and per-endpoint truncation. */
const MAX_DATA_CHARS = 14_000
const MAX_PER_ENDPOINT = 2_000

const SYSTEM_PROMPT = `Anda asisten ahli untuk aplikasi Feasibility Studio (studi kelayakan konstruksi, Cipta Harmoni Lestari).
Jawab dalam Bahasa Indonesia, ringkas, dan langsung ke inti.

Anda diberi dua sumber konteks:
1. DATA APLIKASI — angka dan status proyek yang aktual dari aplikasi. Untuk pertanyaan
   soal biaya, volume, BQ, skenario, clash, atau spesifikasi proyek, prioritaskan sumber ini.
2. PENGETAHUAN — kutipan dari dokumen yang diunggah pengguna. Gunakan untuk hal normatif,
   standar, atau penjelasan yang tidak ada di data aplikasi.

Aturan:
- Jawab HANYA berdasarkan konteks yang diberikan. Jika informasinya tidak ada di konteks,
  katakan terus terang bahwa datanya tidak tersedia dan sebutkan apa yang perlu diunggah
  atau dibuka lebih dulu. Jangan mengarang angka.
- Kalau mengutip angka, sebutkan dari mana (mis. "dari BQ/RAB" atau nama dokumen).
- Jika pertanyaannya ambigu, jawab dengan asumsi paling masuk akal dan sebutkan asumsinya.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const client = openai()
  if (!client) return res.status(503).json({ configured: false, error: OPENAI_MISSING_MESSAGE })

  const body = (req.body ?? {}) as {
    projectId?: string
    messages?: { role?: string; content?: string }[]
  }
  const history = (body.messages ?? [])
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-10)
  const question = history.filter((m) => m.role === 'user').at(-1)?.content?.trim()
  if (!question) return res.status(400).json({ error: 'pertanyaan kosong' })

  const projectId = body.projectId ?? 'default'

  try {
    await ensureSchema()
    const sql = db()

    /* --- 1. semantic search over the knowledge base ----------------------- */
    let sources: { title: string; snippet: string }[] = []
    let knowledgeBlock = ''
    try {
      const embedding = await client.embeddings.create({ model: EMBED_MODEL, input: question })
      const qv = embedding.data[0].embedding as number[]

      const rows = (await sql`
        select c.content, c.embedding, d.title
          from knowledge_chunks c
          join knowledge_docs d on d.id = c.doc_id
         where c.project_id = ${projectId}
         limit ${MAX_CHUNKS_SCANNED}
      `) as { content: string; embedding: number[]; title: string }[]

      const ranked = rows
        .map((r) => ({
          title: r.title,
          content: r.content,
          score: cosine(qv, Array.isArray(r.embedding) ? r.embedding : []),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_K)
        .filter((r) => r.score > 0.15)

      sources = ranked.map((r) => ({
        title: r.title,
        snippet: r.content.slice(0, 240) + (r.content.length > 240 ? '…' : ''),
      }))
      knowledgeBlock = ranked.map((r) => `[${r.title}]\n${r.content}`).join('\n\n---\n\n')
    } catch (err) {
      // Embedding/search failure shouldn't kill the answer — fall back to app data.
      knowledgeBlock = ''
      if ((err as { status?: number }).status === 401) {
        return res.status(502).json({ configured: true, error: describeOpenAiError(err) })
      }
    }

    /* --- 2. the project's own figures ------------------------------------- */
    const dataRows = (await sql`
      select path, value from store
       where path = '/projects' or path like ${'/projects/' + projectId + '/%'}
       order by path
    `) as { path: string; value: unknown }[]

    let projectData = ''
    for (const row of dataRows) {
      const serialized = JSON.stringify(row.value)
      const trimmed =
        serialized.length > MAX_PER_ENDPOINT ? serialized.slice(0, MAX_PER_ENDPOINT) + '…' : serialized
      const entry = `${row.path}: ${trimmed}\n`
      if (projectData.length + entry.length > MAX_DATA_CHARS) break
      projectData += entry
    }

    /* --- 3. answer -------------------------------------------------------- */
    const context =
      (projectData
        ? `DATA APLIKASI (proyek ${projectId}):\n${projectData}\n`
        : 'DATA APLIKASI: belum ada data tersimpan untuk proyek ini.\n') +
      (knowledgeBlock
        ? `\nPENGETAHUAN (dokumen yang diunggah):\n${knowledgeBlock}`
        : '\nPENGETAHUAN: belum ada dokumen relevan yang diunggah.')

    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: context },
        ...history.map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: m.content as string,
        })),
      ],
    })

    return res.status(200).json({
      answer: completion.choices[0]?.message?.content ?? '',
      sources,
      usedProjectData: projectData.length > 0,
    })
  } catch (err) {
    return res.status(502).json({ configured: true, error: describeOpenAiError(err) })
  }
}
