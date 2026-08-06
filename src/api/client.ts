import { upload } from '@vercel/blob/client'

/**
 * Transport layer. Reads go through the Neon-backed `/api/store` endpoint; the
 * first time a resource is missing there, the client seeds it from the bundled
 * fixture so a fresh database fills itself in on first use. If the API can't be
 * reached at all (e.g. `npm run dev` without `vercel dev`), every read falls
 * back to the fixture, so the app keeps working offline.
 */

/** Simulated round-trip time for the fixture fallback path, in ms. */
export const LATENCY = 220

const API_BASE = '/api'
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined

const cache = new Map<string, unknown>()

/** Set once the API is found unreachable, so we stop retrying for the session. */
let apiDown = false

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Synchronous cache probe — lets `useResource` skip the loading frame. */
export function peek<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined
}

export function clearCache() {
  cache.clear()
}

function writeHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (API_KEY) headers['x-api-key'] = API_KEY
  return headers
}

/** Best-effort upsert used to seed the store from a fixture. Never throws. */
async function seed(path: string, value: unknown): Promise<void> {
  if (apiDown) return
  try {
    await fetch(`${API_BASE}/store${path}`, {
      method: 'PUT',
      headers: writeHeaders(),
      body: JSON.stringify(value),
    })
  } catch {
    apiDown = true
  }
}

/**
 * Reads one resource. Order of preference:
 *   1. in-memory cache (instant),
 *   2. Neon via `/api/store<path>`,
 *   3. the bundled `fallback` fixture — which also seeds the store when the row
 *      was simply missing (404), so subsequent loads are served by Neon.
 */
export async function getResource<T>(path: string, fallback: () => T): Promise<T> {
  const hit = cache.get(path)
  if (hit !== undefined) return hit as T

  if (!apiDown) {
    try {
      const res = await fetch(`${API_BASE}/store${path}`)
      if (res.ok) {
        const data = (await res.json()) as T
        cache.set(path, data)
        return data
      }
      if (res.status === 404) {
        const value = fallback()
        cache.set(path, value)
        void seed(path, value)
        return value
      }
      // Any other status: fall through to the fixture without seeding.
    } catch {
      apiDown = true
    }
  }

  await sleep(LATENCY)
  const value = fallback()
  cache.set(path, value)
  return value
}

/** A write the UI waits on (recalculating BQ, re-parsing a document). */
export async function run<T>(payload: () => T, ms: number): Promise<T> {
  await sleep(ms)
  return payload()
}

/** Persists a produced value (e.g. edited scenario weights) back to Neon. */
export async function saveResource(path: string, value: unknown): Promise<void> {
  cache.set(path, value)
  await seed(path, value)
}

export interface DocumentRecord {
  id: string
  project_id: string
  name: string
  url: string
  size?: number
  content_type?: string
  created_at?: string
}

/** Lists uploaded documents for a project (Neon metadata). */
export async function listDocuments(projectId: string): Promise<DocumentRecord[]> {
  if (apiDown) return []
  try {
    const res = await fetch(`${API_BASE}/documents?project=${encodeURIComponent(projectId)}`)
    if (!res.ok) return []
    const body = (await res.json()) as { documents: DocumentRecord[] }
    return body.documents ?? []
  } catch {
    apiDown = true
    return []
  }
}

/**
 * Uploads a file straight to Vercel Blob (client upload) and records it in Neon.
 * The `/api/documents` route hands out a scoped token and writes the metadata
 * row once Blob confirms the upload. Returns a record for optimistic display.
 */
export async function uploadDocument(projectId: string, file: File): Promise<DocumentRecord> {
  try {
    const blob = await upload(`${projectId}/${file.name}`, file, {
      access: 'public',
      handleUploadUrl: `${API_BASE}/documents`,
      clientPayload: JSON.stringify({ projectId, name: file.name, apiKey: API_KEY ?? '' }),
    })
    return { id: blob.pathname, project_id: projectId, name: file.name, url: blob.url }
  } catch (err) {
    // The Blob SDK reports a generic "Failed to retrieve the client token" and
    // discards the server's explanation, so ask /api/health what's actually wrong.
    throw new ApiError(await explainUploadFailure(err))
  }
}

/** Turns an upload error into a message that says what to fix. */
async function explainUploadFailure(err: unknown): Promise<string> {
  const fallback = err instanceof Error ? err.message : 'Upload gagal'
  try {
    const res = await fetch(`${API_BASE}/health`)
    const health = (await res.json()) as {
      blob?: { configured?: boolean; hint?: string }
      neon?: { ok?: boolean; error?: string }
    }
    if (health.blob?.configured === false) {
      return health.blob.hint ?? 'Vercel Blob belum terhubung ke project ini.'
    }
    if (health.neon?.ok === false) {
      return `Database Neon tidak terhubung: ${health.neon.error ?? 'periksa DATABASE_URL'}`
    }
  } catch {
    /* health unreachable — fall through to the SDK's message */
  }
  return fallback
}
