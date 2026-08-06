/** Client for the knowledge base and the RAG chat assistant. */

const API_BASE = '/api'
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined

export interface KnowledgeDoc {
  id: string
  project_id: string
  title: string
  source: string | null
  chars: number
  chunks: number
  created_at?: string
}

export interface ChatSource {
  title: string
  snippet: string
}

function writeHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (API_KEY) headers['x-api-key'] = API_KEY
  return headers
}

/** Reads `error` out of a failed response, falling back to the status text. */
async function errorFrom(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  return body.error ?? `Gagal (${res.status})`
}

export async function listKnowledge(projectId: string): Promise<KnowledgeDoc[]> {
  const res = await fetch(`${API_BASE}/knowledge?project=${encodeURIComponent(projectId)}`)
  if (!res.ok) throw new Error(await errorFrom(res))
  const body = (await res.json()) as { documents: KnowledgeDoc[] }
  return body.documents ?? []
}

export async function addKnowledge(input: {
  projectId: string
  title: string
  source?: string
  text: string
}): Promise<KnowledgeDoc> {
  const res = await fetch(`${API_BASE}/knowledge`, {
    method: 'POST',
    headers: writeHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await errorFrom(res))
  return (await res.json()) as KnowledgeDoc
}

export async function deleteKnowledge(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/knowledge?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: writeHeaders(),
  })
  if (!res.ok) throw new Error(await errorFrom(res))
}

export async function askAssistant(
  projectId: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<{ answer: string; sources: ChatSource[]; usedProjectData: boolean }> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, messages }),
  })
  if (!res.ok) throw new Error(await errorFrom(res))
  return (await res.json()) as {
    answer: string
    sources: ChatSource[]
    usedProjectData: boolean
  }
}

/* ---- turning an uploaded file into plain text --------------------------- */

// Extraction is shared with the Spesifikasi upload flow.
export { extractText, isSupportedFile as isSupportedKnowledgeFile } from './extract'
