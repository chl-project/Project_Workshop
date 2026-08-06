/**
 * Vercel Blob token lookup.
 *
 * The Blob integration normally injects `BLOB_READ_WRITE_TOKEN`, but a store
 * connected with an environment-variable prefix (or a project with more than
 * one store) gets a prefixed name instead — `MYSTORE_READ_WRITE_TOKEN`. The
 * SDK only reads the unprefixed name, so we resolve it ourselves and pass the
 * token explicitly.
 */

/** Blob tokens are issued in this format; used to identify a prefixed var. */
const TOKEN_PREFIX = 'vercel_blob_'

export interface BlobTokenInfo {
  token?: string
  /** Name of the environment variable the token came from. */
  source?: string
}

export function blobToken(): BlobTokenInfo {
  const direct = process.env.BLOB_READ_WRITE_TOKEN
  if (direct) return { token: direct, source: 'BLOB_READ_WRITE_TOKEN' }

  for (const [name, value] of Object.entries(process.env)) {
    if (name.endsWith('_READ_WRITE_TOKEN') && value?.startsWith(TOKEN_PREFIX)) {
      return { token: value, source: name }
    }
  }
  return {}
}

/** Message shown when no token is configured — tells the user what to do. */
export const BLOB_MISSING_MESSAGE =
  'Vercel Blob belum terhubung: environment variable BLOB_READ_WRITE_TOKEN tidak ditemukan. ' +
  'Di Vercel buka Storage → pilih/buat Blob store → Connect ke project ini, lalu Redeploy.'
