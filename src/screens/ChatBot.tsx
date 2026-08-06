import { useEffect, useRef, useState } from 'react'
import { askAssistant, type ChatSource } from '@/lib/knowledge'
import { btnGhost, btnPrimary, card, screenSub, screenTitle } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { ScreenId } from '@/types'

interface Turn {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  usedProjectData?: boolean
  error?: boolean
}

const SUGGESTIONS = [
  'Berapa total RAB proyek ini dan apa komponen terbesarnya?',
  'Skenario mana yang paling masuk akal, dan apa risikonya?',
  'Material apa saja yang statusnya bermasalah?',
  'Ringkas temuan clash yang kritis beserta PIC-nya.',
]

export function ChatBot({
  projectId,
  onNavigate,
}: {
  projectId: string
  onNavigate: (s: ScreenId) => void
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, pending])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || pending) return

    const next: Turn[] = [...turns, { role: 'user', content: question }]
    setTurns(next)
    setInput('')
    setPending(true)

    try {
      const res = await askAssistant(
        projectId,
        next.map((t) => ({ role: t.role, content: t.content })),
      )
      setTurns([
        ...next,
        {
          role: 'assistant',
          content: res.answer || '(tidak ada jawaban)',
          sources: res.sources,
          usedProjectData: res.usedProjectData,
        },
      ])
    } catch (e) {
      setTurns([
        ...next,
        {
          role: 'assistant',
          content: e instanceof Error ? e.message : 'Gagal menghubungi asisten.',
          error: true,
        },
      ])
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ maxWidth: 620 }}>
          <div style={screenTitle}>Asisten AI</div>
          <div style={screenSub}>
            Tanya apa saja tentang proyek ini. Jawaban disusun dari data aplikasi (BQ, biaya,
            spesifikasi, clash) dan dokumen yang Anda unggah di menu Pengetahuan.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {turns.length > 0 && (
            <button type="button" style={btnGhost} onClick={() => setTurns([])}>
              Percakapan baru
            </button>
          )}
          <button type="button" style={btnGhost} onClick={() => onNavigate('know')}>
            Kelola Pengetahuan
          </button>
        </div>
      </div>

      <div style={{ ...card, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 250px)', minHeight: 420 }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {turns.length === 0 && !pending && (
            <div style={{ maxWidth: 560, margin: '24px auto', textAlign: 'center' }}>
              <div style={{ font: sans('600 14px'), marginBottom: 6 }}>
                Mau tahu apa tentang proyek ini?
              </div>
              <div style={{ font: sans('400 12px/1.6'), color: color.muted, marginBottom: 18 }}>
                Asisten membaca data proyek yang tersimpan dan dokumen pengetahuan Anda.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    style={{
                      border: `1px solid ${color.border}`,
                      background: color.surfaceSoft,
                      cursor: 'pointer',
                      borderRadius: 8,
                      padding: '10px 13px',
                      font: sans('400 12px'),
                      color: color.ink,
                      textAlign: 'left',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn, i) => (
            <Bubble key={i} turn={turn} />
          ))}

          {pending && (
            <div style={{ font: mono('400 11.5px'), color: color.faint, padding: '6px 2px' }}>
              Asisten sedang menyusun jawaban…
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send(input)
          }}
          style={{
            display: 'flex',
            gap: 8,
            padding: '12px 14px',
            borderTop: `1px solid ${color.borderSoft}`,
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis pertanyaan…"
            aria-label="Pertanyaan"
            style={{
              flex: 1,
              border: `1px solid ${color.border}`,
              borderRadius: 8,
              padding: '10px 12px',
              font: sans('400 12.5px'),
              color: color.ink,
              background: color.surface,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={pending || !input.trim()}
            style={{ ...btnPrimary, padding: '10px 18px', opacity: pending || !input.trim() ? 0.6 : 1 }}
          >
            Kirim
          </button>
        </form>
      </div>
    </>
  )
}

function Bubble({ turn }: { turn: Turn }) {
  const isUser = turn.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
      <div style={{ maxWidth: '80%' }}>
        <div
          style={{
            background: isUser ? color.greenTint : turn.error ? color.redPanelBg : color.surfaceMuted,
            border: `1px solid ${
              isUser ? color.greenLine : turn.error ? color.redPanelBorder : color.borderSoft
            }`,
            color: turn.error ? color.redPanelText : color.ink,
            borderRadius: 10,
            padding: '11px 14px',
            font: sans('400 12.5px/1.7'),
            whiteSpace: 'pre-wrap',
          }}
        >
          {turn.content}
        </div>

        {!isUser && !turn.error && (turn.sources?.length || turn.usedProjectData) && (
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {turn.usedProjectData && (
              <span style={tagStyle}>data aplikasi</span>
            )}
            {turn.sources?.map((s, i) => (
              <span key={i} style={tagStyle} title={s.snippet}>
                {s.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const tagStyle = {
  font: mono('400 10.5px'),
  color: color.muted,
  border: `1px solid ${color.border}`,
  borderRadius: 20,
  padding: '3px 9px',
  background: color.surface,
}
