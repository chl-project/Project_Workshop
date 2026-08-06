import { randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { BLOB_MISSING_MESSAGE, blobToken } from './_lib/blob.js'
import { db, ensureSchema } from './_lib/db.js'
import { allowCors } from './_lib/http.js'

/**
 * Document store. Uploads use Vercel Blob *client uploads*: the browser asks
 * this route for a short-lived token, then streams the file straight to Blob
 * storage — which sidesteps the 4.5 MB serverless request-body limit, so large
 * RKS/MEP PDFs work. The file bytes live in Blob; the metadata row lives in Neon
 * and is written from the `onUploadCompleted` callback.
 *
 *   GET  /api/documents?project=anggrek   -> list documents (Neon metadata)
 *   POST /api/documents                   -> Blob client-upload handshake
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    if (req.method === 'GET') {
      await ensureSchema()
      const sql = db()
      const project = String(req.query.project ?? '')
      const rows = project
        ? await sql`select id, project_id, name, url, size, content_type, created_at
                      from documents where project_id = ${project} order by created_at desc`
        : await sql`select id, project_id, name, url, size, content_type, created_at
                      from documents order by created_at desc`
      return res.status(200).json({ documents: rows })
    }

    if (req.method === 'POST') {
      const { token } = blobToken()
      if (!token) {
        return res.status(503).json({ configured: false, error: BLOB_MISSING_MESSAGE })
      }
      const body = req.body as HandleUploadBody
      const json = await handleUpload({
        body,
        request: req,
        token,
        onBeforeGenerateToken: async (_pathname, clientPayload) => {
          const payload = clientPayload ? (JSON.parse(clientPayload) as { apiKey?: string }) : {}
          // Enforce the shared key only when the server has one configured.
          if (process.env.API_KEY && payload.apiKey !== process.env.API_KEY) {
            throw new Error('unauthorized')
          }
          return {
            addRandomSuffix: true,
            tokenPayload: clientPayload ?? '',
          }
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          const payload = tokenPayload
            ? (JSON.parse(tokenPayload) as { projectId?: string; name?: string })
            : {}
          await ensureSchema()
          const sql = db()
          await sql`
            insert into documents (id, project_id, name, url, content_type)
            values (
              ${randomUUID()},
              ${payload.projectId ?? 'default'},
              ${payload.name ?? blob.pathname},
              ${blob.url},
              ${blob.contentType ?? null}
            )
          `
        },
      })
      return res.status(200).json(json)
    }

    return res.status(405).json({ error: 'method not allowed' })
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
