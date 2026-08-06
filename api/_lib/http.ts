import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Write operations require the shared key when `API_KEY` is configured on the
 * server. If it is not set, writes are open — convenient for a fresh workshop
 * deploy before you lock things down.
 */
export function authorized(req: VercelRequest): boolean {
  const required = process.env.API_KEY
  if (!required) return true
  const header = req.headers['x-api-key']
  const got = Array.isArray(header) ? header[0] : header
  return got === required
}

/** True when an `API_KEY` is configured and therefore enforced on writes. */
export function keyEnforced(): boolean {
  return Boolean(process.env.API_KEY)
}

export function allowCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
}
