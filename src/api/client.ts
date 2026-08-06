/**
 * Mock transport. Every screen reads its data through here, so swapping these
 * functions for real `fetch` calls later is a drop-in change: the components
 * already deal with pending / error states.
 */

/** Simulated round-trip time, in ms. Set to 0 in tests. */
export const LATENCY = 220

const cache = new Map<string, unknown>()

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

/**
 * Resolves `payload` after a short delay and memoises it under `key`, the way a
 * real client would serve a warm cache. Screens revisited within a session then
 * render immediately instead of flashing a skeleton.
 */
export async function get<T>(key: string, payload: () => T, ms = LATENCY): Promise<T> {
  const hit = cache.get(key)
  if (hit !== undefined) return hit as T
  await sleep(ms)
  const data = payload()
  cache.set(key, data)
  return data
}

/** Synchronous cache probe — lets `useResource` skip the loading frame. */
export function peek<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined
}

/** A write that the UI waits on (recalculating BQ, re-parsing a document). */
export async function run<T>(payload: () => T, ms: number): Promise<T> {
  await sleep(ms)
  return payload()
}

export function clearCache() {
  cache.clear()
}
