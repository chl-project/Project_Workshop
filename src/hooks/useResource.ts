import { useEffect, useState } from 'react'
import { peek } from '@/api/client'

export interface Resource<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * Reads one endpoint. If the value is already cached, the first render is
 * already `loading: false` — so returning to a screen doesn't flash a skeleton.
 */
export function useResource<T>(cacheKey: string, load: () => Promise<T>): Resource<T> {
  const cached = peek<T>(cacheKey) ?? null
  const [state, setState] = useState<Resource<T>>({
    data: cached,
    loading: cached === null,
    error: null,
  })

  useEffect(() => {
    const warm = peek<T>(cacheKey)
    if (warm !== undefined) {
      setState({ data: warm, loading: false, error: null })
      return
    }

    let alive = true
    setState({ data: null, loading: true, error: null })
    load()
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (alive) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      })
    return () => {
      alive = false
    }
    // `load` is recreated per render by callers; the cache key identifies the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey])

  return state
}
