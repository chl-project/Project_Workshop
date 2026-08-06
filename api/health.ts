import type { VercelRequest, VercelResponse } from '@vercel/node'
import { connectionString, db, ensureSchema } from './_lib/db.js'
import { allowCors, keyEnforced } from './_lib/http.js'

/**
 * Verification endpoint. Open `/api/health` after deploying to confirm the
 * three pieces of the setup are actually reachable from the running function:
 * Neon (a live query), Blob (token present), and the API key (whether enforced).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  allowCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const neon: Record<string, unknown> = { configured: Boolean(connectionString()) }
  try {
    await ensureSchema()
    const sql = db()
    const rows = await sql`select count(*)::int as n from store`
    neon.ok = true
    neon.storeRows = rows[0]?.n ?? 0
  } catch (err) {
    neon.ok = false
    neon.error = err instanceof Error ? err.message : String(err)
  }

  const blob = {
    configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    // The token is validated for real on the first upload; here we only report
    // whether it was injected into the environment.
    ok: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  }

  const apiKey = { enforced: keyEnforced() }

  const ok = neon.ok === true && blob.configured
  return res.status(ok ? 200 : 503).json({
    ok,
    time: new Date().toISOString(),
    neon,
    blob,
    apiKey,
  })
}
