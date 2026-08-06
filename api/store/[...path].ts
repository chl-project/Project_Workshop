import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db, ensureSchema } from '../_lib/db.js'
import { allowCors, authorized } from '../_lib/http.js'

/**
 * Generic JSONB key/value store backed by Neon. The `path` maps 1:1 to the
 * REST-shaped cache keys the frontend already uses (e.g. `/projects/anggrek/bq`),
 * so the data layer becomes a real database read with no shape translation.
 *
 *   GET  /api/store/projects/anggrek/bq  -> the stored value, or 404
 *   PUT  /api/store/projects/anggrek/bq  -> upsert the JSON body (needs api key)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const parts = req.query.path
  const segments = Array.isArray(parts) ? parts : parts ? [parts] : []
  if (segments.length === 0) return res.status(400).json({ error: 'missing path' })
  const path = '/' + segments.join('/')

  try {
    await ensureSchema()
    const sql = db()

    if (req.method === 'GET') {
      const rows = await sql`select value from store where path = ${path}`
      if (rows.length === 0) return res.status(404).json({ error: 'not found', path })
      return res.status(200).json(rows[0].value)
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' })
      const value = req.body
      if (value === undefined || value === null) {
        return res.status(400).json({ error: 'missing body' })
      }
      const json = JSON.stringify(value)
      await sql`
        insert into store (path, value)
        values (${path}, ${json}::jsonb)
        on conflict (path) do update
          set value = excluded.value, updated_at = now()
      `
      return res.status(200).json({ ok: true, path })
    }

    return res.status(405).json({ error: 'method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
