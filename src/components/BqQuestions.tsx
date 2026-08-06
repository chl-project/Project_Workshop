import { useState } from 'react'
import { Chip } from '@/components/primitives'
import { btnPrimary, card } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { ChipTone } from '@/theme/styles'
import type { BqQuestion, BuildUpDoc } from '@/types'

/**
 * The data the estimate is missing, as questions the user can answer.
 *
 * An uploaded drawing set almost never carries everything a price needs. The
 * bill is produced regardless — on stated assumptions, because a number today
 * beats a perfect number next week — but each assumption that could move the
 * total is surfaced here with what was assumed in its place. Answering and
 * recalculating feeds the replies back as fact.
 */

const impactTone: Record<BqQuestion['impact'], ChipTone> = {
  tinggi: 'red',
  sedang: 'amber',
  rendah: 'neutral',
}

const impactNote: Record<BqQuestion['impact'], string> = {
  tinggi: 'menggeser total >10%',
  sedang: 'menggeser total 3–10%',
  rendah: 'menggeser total <3%',
}

export function BqQuestions({
  doc,
  busy,
  onAnswer,
  onRecalculate,
}: {
  doc: BuildUpDoc
  busy: boolean
  onAnswer: (id: string, answer: string) => void
  onRecalculate: () => void
}) {
  const open = doc.questions.filter((q) => !q.answer)
  const answered = doc.questions.filter((q) => q.answer)
  const [showAnswered, setShowAnswered] = useState(false)

  if (doc.questions.length === 0) return null

  return (
    <div
      style={{
        ...card,
        borderColor: open.length > 0 ? color.amberBannerBorder : color.border,
        background: open.length > 0 ? color.amberBannerBg : color.surface,
        padding: '16px 18px',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ font: sans('600 13px') }}>
          {open.length > 0
            ? `Data yang masih dibutuhkan (${open.length})`
            : 'Semua pertanyaan sudah dijawab'}
        </div>
        <div style={{ flex: 1 }} />
        {answered.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAnswered((v) => !v)}
            style={{
              border: 0,
              background: 'none',
              cursor: 'pointer',
              font: mono('400 11px'),
              color: color.muted,
              padding: 0,
            }}
          >
            {showAnswered ? 'sembunyikan' : 'lihat'} {answered.length} jawaban
          </button>
        )}
      </div>

      <div
        style={{
          font: sans('400 11.5px/1.6'),
          color: color.amberPanelText,
          marginTop: 5,
          maxWidth: 780,
        }}
      >
        Bill di bawah sudah bisa dipakai — tiap kekosongan diisi asumsi yang wajar. Jawab yang
        Anda tahu, lalu hitung ulang: jawaban diperlakukan sebagai fakta dan mengalahkan asumsi.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        {open.map((q) => (
          <QuestionRow key={q.id} q={q} onAnswer={onAnswer} />
        ))}
        {showAnswered &&
          answered.map((q) => <QuestionRow key={q.id} q={q} onAnswer={onAnswer} />)}
      </div>

      {answered.length > 0 && (
        <button
          type="button"
          className="btn-primary"
          onClick={onRecalculate}
          disabled={busy}
          style={{ ...btnPrimary, marginTop: 14, padding: '9px 16px' }}
        >
          {busy
            ? 'Menghitung ulang…'
            : `✦ Hitung ulang dengan ${answered.length} jawaban ini`}
        </button>
      )}
    </div>
  )
}

function QuestionRow({
  q,
  onAnswer,
}: {
  q: BqQuestion
  onAnswer: (id: string, answer: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? q.answer ?? ''
  const commit = () => {
    if (draft != null && draft !== (q.answer ?? '')) onAnswer(q.id, draft)
    setDraft(null)
  }

  return (
    <div
      style={{
        background: color.surface,
        border: `1px solid ${q.answer ? color.greenLine : color.border}`,
        borderRadius: 8,
        padding: '11px 13px',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ font: sans('500 12.5px'), flex: 1, minWidth: 'min(260px, 100%)' }}>
          {q.question}
        </span>
        <Chip tone={q.answer ? 'green' : impactTone[q.impact]}>
          {q.answer ? 'terjawab' : `dampak ${q.impact}`}
        </Chip>
      </div>

      <div style={{ font: mono('400 10.5px/1.7'), color: color.faint, marginTop: 5 }}>
        {q.affects && (
          <>
            memengaruhi {q.affects} · {impactNote[q.impact]}
            <br />
          </>
        )}
        {q.assumed && <>sementara diasumsikan: {q.assumed}</>}
      </div>

      <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 9 }}>
        {q.kind === 'choice' && q.options ? (
          <select
            value={value}
            onChange={(e) => onAnswer(q.id, e.target.value)}
            style={{ ...fieldStyle, width: '100%', maxWidth: 320, minWidth: 0 }}
          >
            <option value="">— pilih —</option>
            {q.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={value}
            inputMode={q.kind === 'number' ? 'decimal' : undefined}
            placeholder={q.kind === 'number' ? 'angka' : 'jawaban Anda'}
            aria-label={q.question}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') {
                setDraft(null)
                e.currentTarget.blur()
              }
            }}
            style={{
              ...fieldStyle,
              width: q.kind === 'number' ? 120 : '100%',
              maxWidth: 320,
              minWidth: 0,
            }}
          />
        )}
        {q.unit && <span style={{ font: mono('400 11px'), color: color.faint }}>{q.unit}</span>}
        {q.answer && (
          <button
            type="button"
            onClick={() => {
              setDraft(null)
              onAnswer(q.id, '')
            }}
            style={{
              border: 0,
              background: 'none',
              cursor: 'pointer',
              font: mono('400 11px'),
              color: color.muted,
            }}
          >
            hapus
          </button>
        )}
      </div>
    </div>
  )
}

const fieldStyle = {
  border: `1px solid ${color.border}`,
  background: color.surfaceSoft,
  borderRadius: 6,
  padding: '7px 9px',
  font: sans('400 12px'),
  color: color.ink,
} as const
