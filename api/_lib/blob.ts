/**
 * Vercel Blob token lookup.
 *
 * The Blob integration normally injects `BLOB_READ_WRITE_TOKEN`, but a store
 * connected with an environment-variable prefix (or a project with more than
 * one store) gets a prefixed name instead — `MYSTORE_READ_WRITE_TOKEN`. The
 * SDK only reads the unprefixed name, so we resolve it ourselves and pass the
 * token explicitly.
 */

/** Blob tokens are issued in this format; used to rank candidate variables. */
const TOKEN_PREFIX = 'vercel_blob_'
const TOKEN_SUFFIX = '_READ_WRITE_TOKEN'

export interface BlobTokenInfo {
  token?: string
  /** Name of the environment variable the token came from. */
  source?: string
}

/**
 * Finds the Blob read-write token. A store connected without a prefix supplies
 * `BLOB_READ_WRITE_TOKEN`; a prefixed store supplies e.g.
 * `BLOB_ESTATE_READ_WRITE_TOKEN`, which the SDK does not look for. Prefer an
 * exact match, then a value that looks like a Blob token, then any
 * `*_READ_WRITE_TOKEN` at all so an unfamiliar token format still works.
 */
export function blobToken(): BlobTokenInfo {
  const direct = process.env.BLOB_READ_WRITE_TOKEN
  if (direct) return { token: direct, source: 'BLOB_READ_WRITE_TOKEN' }

  const candidates = Object.entries(process.env).filter(
    ([name, value]) => name.endsWith(TOKEN_SUFFIX) && Boolean(value),
  ) as [string, string][]

  const looksLikeToken = candidates.find(([, value]) => value.startsWith(TOKEN_PREFIX))
  if (looksLikeToken) return { token: looksLikeToken[1], source: looksLikeToken[0] }

  const fallback = candidates[0]
  return fallback ? { token: fallback[1], source: fallback[0] } : {}
}

/** Message shown when no token is configured — tells the user what to do. */
export const BLOB_MISSING_MESSAGE =
  'Vercel Blob belum terhubung: environment variable BLOB_READ_WRITE_TOKEN tidak ditemukan. ' +
  'Di Vercel buka Storage → pilih/buat Blob store → Connect ke project ini, lalu Redeploy.'
