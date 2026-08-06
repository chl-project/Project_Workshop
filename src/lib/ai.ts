/** Client for the AI Value-Engineering suggestion endpoint. */

export interface VeSuggestion {
  item: string
  change: string
  saving: string
  note?: string
}

export interface VeSuggestResult {
  ok: boolean
  configured: boolean
  suggestions?: VeSuggestion[]
  error?: string
}

/**
 * Asks the server to generate VE proposals. The server calls the configured LLM
 * (Anthropic) using its API key; if no key is set it returns `configured:false`
 * so the UI can explain what to configure instead of failing opaquely.
 */
export async function requestVeSuggestions(
  projectId: string,
  context: string[],
): Promise<VeSuggestResult> {
  try {
    const res = await fetch('/api/ve-suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, context }),
    })
    const body = (await res.json().catch(() => ({}))) as {
      suggestions?: VeSuggestion[]
      error?: string
      configured?: boolean
    }
    if (!res.ok) {
      return { ok: false, configured: body.configured ?? false, error: body.error ?? 'Gagal memuat usulan' }
    }
    return { ok: true, configured: true, suggestions: body.suggestions ?? [] }
  } catch (err) {
    return { ok: false, configured: false, error: err instanceof Error ? err.message : 'Jaringan gagal' }
  }
}
