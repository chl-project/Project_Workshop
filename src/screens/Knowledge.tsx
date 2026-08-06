import { useEffect, useRef, useState } from 'react'
import {
  addKnowledge,
  deleteKnowledge,
  isSupportedKnowledgeFile,
  listKnowledge,
  type KnowledgeDoc,
} from '@/lib/knowledge'
import { readDocument } from '@/lib/ocr'
import { autoGrid, btnGhost, btnPrimary, card, cardClipped, screenSub, screenTitle } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { ScreenId } from '@/types'

export function Knowledge({
  projectId,
  onNavigate,
}: {
  projectId: string
  onNavigate: (s: ScreenId) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [text, setText] = useState('')

  const refresh = () =>
    listKnowledge(projectId)
      .then(setDocs)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Gagal memuat'))
      .finally(() => setLoading(false))

  useEffect(() => {
    setLoading(true)
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const ingest = async (docTitle: string, source: string | undefined, body: string) => {
    const created = await addKnowledge({ projectId, title: docTitle, source, text: body })
    setDocs((prev) => [created, ...prev])
    setNotice(`"${created.title}" tersimpan — ${created.chunks} bagian siap dicari.`)
  }

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError(null)
    setNotice(null)
    try {
      for (const file of Array.from(files)) {
        if (!isSupportedKnowledgeFile(file.name)) {
          throw new Error(
            `${file.name}: format belum didukung (pakai PDF, gambar, XLSX, CSV, TXT, atau MD).`,
          )
        }
        // Scanned PDFs and photos are transcribed first, then indexed as text.
        const read = await readDocument(file, setBusy)
        setBusy(`Mengindeks ${file.name}…`)
        await ingest(file.name.replace(/\.[^.]+$/, ''), file.name, read.text)
        if (read.note) setNotice((prev) => `${prev ?? ''} (${read.note})`.trim())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memproses berkas')
    } finally {
      setBusy(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const onPaste = async () => {
    if (!text.trim()) return
    setError(null)
    setNotice(null)
    setBusy('Memproses teks…')
    try {
      await ingest(title.trim() || 'Catatan', 'teks', text)
      setTitle('')
      setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (doc: KnowledgeDoc) => {
    setError(null)
    setNotice(null)
    try {
      await deleteKnowledge(doc.id)
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus')
    }
  }

  const totalChunks = docs.reduce((sum, d) => sum + (d.chunks ?? 0), 0)

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
          marginBottom: 18,
        }}
      >
        <div style={{ maxWidth: 620 }}>
          <div style={screenTitle}>Pengetahuan (Knowledge Base)</div>
          <div style={screenSub}>
            Unggah dokumen — RKS, SNI, AHSP, notulen, standar internal — supaya asisten bisa
            menjawab berdasarkan isinya, bukan menebak.
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost"
          style={btnGhost}
          onClick={() => onNavigate('chat')}
        >
          Buka Asisten AI →
        </button>
      </div>

      {error && <Banner tone="red">{error}</Banner>}
      {notice && <Banner tone="green">{notice}</Banner>}

      <div style={{ ...autoGrid(280, 16), marginBottom: 16 }}>
        <div style={{ ...card, padding: '18px 20px' }}>
          <div style={{ font: sans('600 13px'), marginBottom: 4 }}>Unggah berkas</div>
          <div style={{ font: sans('400 11.5px/1.6'), color: color.muted, marginBottom: 14 }}>
            PDF, gambar hasil scan/foto, XLSX, CSV, TXT, atau MD. PDF hasil pindai dan gambar
            dibaca otomatis dengan OCR, lalu dipecah dan diindeks.
          </div>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.txt,.md,.markdown,.csv,.json,.log,.yml,.yaml"
            onChange={(e) => void onFiles(e.target.files)}
          />
          <button
            type="button"
            className="btn-primary"
            style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}
            disabled={Boolean(busy)}
            onClick={() => fileInput.current?.click()}
          >
            {busy ?? '＋ Pilih berkas'}
          </button>
        </div>

        <div style={{ ...card, padding: '18px 20px' }}>
          <div style={{ font: sans('600 13px'), marginBottom: 4 }}>Tempel teks</div>
          <div style={{ font: sans('400 11.5px/1.6'), color: color.muted, marginBottom: 12 }}>
            Untuk catatan singkat, kutipan standar, atau hasil salin dari PDF hasil scan.
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul (mis. Standar finishing internal)"
            style={inputStyle}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tempel isi dokumen di sini…"
            rows={5}
            style={{ ...inputStyle, marginTop: 8, resize: 'vertical', font: sans('400 12px/1.6') }}
          />
          <button
            type="button"
            className="btn-primary"
            style={{ ...btnPrimary, marginTop: 10, opacity: busy || !text.trim() ? 0.6 : 1 }}
            disabled={Boolean(busy) || !text.trim()}
            onClick={() => void onPaste()}
          >
            Simpan ke pengetahuan
          </button>
        </div>
      </div>

      <div style={cardClipped}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 15px',
            borderBottom: `1px solid ${color.borderSoft}`,
          }}
        >
          <div style={{ font: sans('600 12.5px') }}>Dokumen tersimpan</div>
          <span style={{ font: mono('400 11px'), color: color.faint }}>
            {docs.length} dokumen · {totalChunks} bagian terindeks
          </span>
        </div>

        {loading ? (
          <div style={emptyStyle}>Memuat…</div>
        ) : docs.length === 0 ? (
          <div style={emptyStyle}>
            Belum ada dokumen. Unggah berkas atau tempel teks di atas — setelah itu asisten bisa
            menjawab berdasarkan isinya.
          </div>
        ) : (
          docs.map((doc, i) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 15px',
                borderBottom: i === docs.length - 1 ? undefined : `1px solid ${color.rowLine}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: sans('500 12.5px') }}>{doc.title}</div>
                <div style={{ font: mono('400 11px'), color: color.faint, marginTop: 3 }}>
                  {doc.source ?? 'teks'} · {doc.chars.toLocaleString('id-ID')} karakter ·{' '}
                  {doc.chunks} bagian
                </div>
              </div>
              <button
                type="button"
                onClick={() => void remove(doc)}
                style={{
                  border: `1px solid ${color.redPanelBorder}`,
                  background: 'transparent',
                  color: color.redText,
                  cursor: 'pointer',
                  borderRadius: 6,
                  padding: '6px 11px',
                  font: sans('500 11.5px'),
                }}
              >
                Hapus
              </button>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function Banner({ tone, children }: { tone: 'red' | 'green'; children: React.ReactNode }) {
  const red = tone === 'red'
  return (
    <div
      style={{
        background: red ? color.redPanelBg : color.greenTint,
        border: `1px solid ${red ? color.redPanelBorder : color.greenLine}`,
        color: red ? color.redPanelText : color.greenText,
        borderRadius: 9,
        padding: '11px 14px',
        font: sans('400 12px/1.6'),
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: `1px solid ${color.border}`,
  borderRadius: 7,
  padding: '9px 11px',
  font: sans('400 12px'),
  color: color.ink,
  background: color.surface,
  outline: 'none',
}

const emptyStyle = {
  padding: '28px 20px',
  font: sans('400 12px/1.6'),
  color: color.muted,
  textAlign: 'center' as const,
}
