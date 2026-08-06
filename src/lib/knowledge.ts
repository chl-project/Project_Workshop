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

const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv', '.json', '.log', '.yml', '.yaml']

export function isSupportedKnowledgeFile(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith('.pdf') || TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/**
 * Extracts text from a file so it can be embedded. PDFs are parsed in the
 * browser with pdf.js, which is imported lazily so the viewer only loads when
 * someone actually uploads a PDF.
 */
export async function extractText(file: File): Promise<string> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.pdf')) return extractPdfText(file)
  if (TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))) return file.text()
  throw new Error(
    `Format ${file.name.split('.').pop() ?? ''} belum didukung. Gunakan PDF, TXT, MD, CSV, atau JSON — ` +
      'atau salin isinya ke kotak teks.',
  )
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const buffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) })
  const doc = await loadingTask.promise

  const pages: string[] = []
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (text) pages.push(text)
    }
  } finally {
    await loadingTask.destroy()
  }

  const joined = pages.join('\n\n')
  if (!joined.trim()) {
    throw new Error(
      'PDF ini tidak memuat teks yang bisa dibaca (kemungkinan hasil scan). ' +
        'Gunakan PDF hasil ekspor, atau salin teksnya ke kotak teks.',
    )
  }
  return joined
}
