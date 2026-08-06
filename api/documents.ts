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
 * RKS/MEP PDFs work. The file bytes live in Blob; the metadata row lives in Neon.
 *
 * That row is written twice over, from whichever path lands first: Blob's
 * `onUploadCompleted` webhook, and a `?action=record` call the browser makes
 * once the upload resolves. The webhook can't reach a local dev server and may
 * fail in production, which would otherwise leave an uploaded file with no row.
 * Both inserts skip a URL that is already recorded, so the pair is idempotent.
 *
 *   GET  /api/documents?project=anggrek   -> list documents (Neon metadata)
 *   POST /api/documents                   -> Blob client-upload handshake
 *   POST /api/documents?action=record     -> record metadata for an upload
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    if (req.method === 'POST' && req.query.action === 'record') {
      const body = (req.body ?? {}) as {
        projectId?: string
        name?: string
        url?: string
        size?: number
        contentType?: string
      }
      if (!body.url || !body.name) return res.status(400).json({ error: 'missing url or name' })
      await ensureSchema()
      await recordDocument({
        projectId: body.projectId ?? 'default',
        name: body.name,
        url: body.url,
        size: body.size ?? null,
        contentType: body.contentType ?? null,
      })
      return res.status(200).json({ ok: true })
    }

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
          await recordDocument({
            projectId: payload.projectId ?? 'default',
            name: payload.name ?? blob.pathname,
            url: blob.url,
            size: null,
            contentType: blob.contentType ?? null,
          })
        },
      })
      return res.status(200).json(json)
    }

    return res.status(405).json({ error: 'method not allowed' })
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : String(err) })
  }
}

/** Inserts the metadata row unless this URL is already recorded. */
async function recordDocument(doc: {
  projectId: string
  name: string
  url: string
  size: number | null
  contentType: string | null
}): Promise<void> {
  const sql = db()
  await sql`
    insert into documents (id, project_id, name, url, size, content_type)
    select ${randomUUID()}, ${doc.projectId}, ${doc.name}, ${doc.url}, ${doc.size}, ${doc.contentType}
     where not exists (select 1 from documents where url = ${doc.url})
  `
}
