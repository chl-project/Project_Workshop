import type { VercelRequest, VercelResponse } from '@vercel/node'
import { BLOB_MISSING_MESSAGE, blobToken } from './_lib/blob.js'
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

  // The token is validated for real on the first upload; here we only report
  // whether one was found in the environment, and which variable held it.
  const { token, source } = blobToken()
  const blob: Record<string, unknown> = { configured: Boolean(token), ok: Boolean(token) }
  if (source) {
    blob.source = source
  } else {
    blob.hint = BLOB_MISSING_MESSAGE
    // Names only, never values: says whether the variable is absent from the
    // running function's environment or present under an unexpected name.
    blob.blobVarsVisible = Object.keys(process.env)
      .filter((n) => n.includes('BLOB') || n.endsWith('_READ_WRITE_TOKEN'))
      .sort()
  }

  const ai = {
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || 'gpt-4o',
  }

  const apiKey = { enforced: keyEnforced() }

  // Identifies the deployment, so a stale build is obvious rather than looking
  // like a configuration problem.
  const build = {
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown').slice(0, 7),
    env: process.env.VERCEL_ENV ?? 'unknown',
  }

  const ok = neon.ok === true && blob.configured === true
  return res.status(ok ? 200 : 503).json({
    ok,
    time: new Date().toISOString(),
    build,
    neon,
    blob,
    ai,
    apiKey,
  })
}
