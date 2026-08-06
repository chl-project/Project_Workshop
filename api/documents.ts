import { randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put } from '@vercel/blob'
import { db, ensureSchema } from './_lib/db.js'
import { allowCors, authorized, readRawBody } from './_lib/http.js'

/**
 * Document store: the file bytes live in Vercel Blob, the metadata row lives in
 * Neon. Powers the "Upload dokumen" action on the Spesifikasi screen.
 *
 *   GET  /api/documents?project=anggrek         -> list documents
 *   POST /api/documents  (raw file body)        -> upload + record (needs api key)
 *        headers: x-filename, x-project, content-type
 */
export const config = { api: { bodyParser: false } }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    await ensureSchema()
    const sql = db()

    if (req.method === 'GET') {
      const project = String(req.query.project ?? '')
      const rows = project
        ? await sql`select id, project_id, name, url, size, content_type, created_at
                      from documents where project_id = ${project} order by created_at desc`
        : await sql`select id, project_id, name, url, size, content_type, created_at
                      from documents order by created_at desc`
      return res.status(200).json({ documents: rows })
    }

    if (req.method === 'POST') {
      if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' })
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(503).json({ error: 'BLOB_READ_WRITE_TOKEN is not configured' })
      }

      const header = (name: string): string => {
        const v = req.headers[name]
        return (Array.isArray(v) ? v[0] : v) ?? ''
      }
      const project = header('x-project') || 'default'
      const filename = header('x-filename') || 'dokumen'
      const contentType = header('content-type') || 'application/octet-stream'

      const body = await readRawBody(req)
      if (body.length === 0) return res.status(400).json({ error: 'empty file' })

      const blob = await put(`${project}/${Date.now()}-${filename}`, body, {
        access: 'public',
        contentType,
      })

      const id = randomUUID()
      await sql`
        insert into documents (id, project_id, name, url, size, content_type)
        values (${id}, ${project}, ${filename}, ${blob.url}, ${body.length}, ${contentType})
      `
      return res.status(201).json({
        id,
        project_id: project,
        name: filename,
        url: blob.url,
        size: body.length,
        content_type: contentType,
      })
    }

    return res.status(405).json({ error: 'method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
