import { randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db, ensureSchema } from './_lib/db.js'
import { allowCors, authorized } from './_lib/http.js'
import { chunkText, describeOpenAiError, embedAll, openai, OPENAI_MISSING_MESSAGE } from './_lib/openai.js'

/**
 * Knowledge base behind the RAG assistant.
 *
 *   GET    /api/knowledge?project=anggrek        -> list documents
 *   POST   /api/knowledge  {projectId,title,source,text}
 *                                                -> chunk + embed + store
 *   DELETE /api/knowledge?id=doc_...&project=... -> remove a document
 */

/** Embedding a large document takes several round trips — give it room. */
export const config = { maxDuration: 60 }

/** Guards against a single document blowing past the embedding budget. */
const MAX_CHARS = 200_000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    await ensureSchema()
    const sql = db()

    if (req.method === 'GET') {
      const project = String(req.query.project ?? '')
      const rows = project
        ? await sql`select id, project_id, title, source, chars, chunks, created_at
                      from knowledge_docs where project_id = ${project}
                      order by created_at desc`
        : await sql`select id, project_id, title, source, chars, chunks, created_at
                      from knowledge_docs order by created_at desc`
      return res.status(200).json({ documents: rows })
    }

    if (req.method === 'DELETE') {
      if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' })
      const id = String(req.query.id ?? '')
      if (!id) return res.status(400).json({ error: 'missing id' })
      await sql`delete from knowledge_chunks where doc_id = ${id}`
      await sql`delete from knowledge_docs where id = ${id}`
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'POST') {
      if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' })

      const client = openai()
      if (!client) return res.status(503).json({ configured: false, error: OPENAI_MISSING_MESSAGE })

      const body = (req.body ?? {}) as {
        projectId?: string
        title?: string
        source?: string
        text?: string
      }
      const text = (body.text ?? '').trim()
      const title = (body.title ?? '').trim() || 'Tanpa judul'
      if (!text) return res.status(400).json({ error: 'teks kosong' })
      if (text.length > MAX_CHARS) {
        return res.status(413).json({
          error: `Dokumen terlalu besar (${text.length} karakter). Maksimum ${MAX_CHARS}.`,
        })
      }

      const pieces = chunkText(text)
      if (pieces.length === 0) return res.status(400).json({ error: 'tidak ada teks yang bisa diproses' })

      let vectors: number[][]
      try {
        vectors = await embedAll(client, pieces)
      } catch (err) {
        return res.status(502).json({ configured: true, error: describeOpenAiError(err) })
      }

      const docId = randomUUID()
      const projectId = body.projectId ?? 'default'
      await sql`
        insert into knowledge_docs (id, project_id, title, source, chars, chunks)
        values (${docId}, ${projectId}, ${title}, ${body.source ?? null}, ${text.length}, ${pieces.length})
      `
      // One round trip for every chunk, rather than one per chunk — a long RKS
      // produces hundreds of chunks and would otherwise outlast the function.
      const ids = pieces.map(() => randomUUID())
      const idxs = pieces.map((_, i) => i)
      const vectorJson = vectors.map((v) => JSON.stringify(v))
      await sql`
        insert into knowledge_chunks (id, doc_id, project_id, idx, content, embedding)
        select t.id, ${docId}, ${projectId}, t.idx, t.content, t.embedding::jsonb
          from unnest(${ids}::text[], ${idxs}::int[], ${pieces}::text[], ${vectorJson}::text[])
            as t(id, idx, content, embedding)
      `

      return res.status(201).json({
        id: docId,
        project_id: projectId,
        title,
        source: body.source ?? null,
        chars: text.length,
        chunks: pieces.length,
      })
    }

    return res.status(405).json({ error: 'method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
