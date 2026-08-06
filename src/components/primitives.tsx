import type { CSSProperties, ReactNode } from 'react'
import { color, mono, sans } from '@/theme/tokens'
import { chip, type ChipTone } from '@/theme/styles'

/** Pill badge — "Jelas ✓", "Disetujui", "2 clash kritis". */
export function Chip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return <span style={chip(tone)}>{children}</span>
}

/** Segmented control on a #EDEDE6 track; the active segment is a white pill. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  padding = '6px 11px',
  font = mono('500 11.5px'),
  fill,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  padding?: string
  font?: string
  /** stretch each segment to equal width (used by the floor picker) */
  fill?: boolean
}) {
  return (
    <div style={{ display: 'flex', background: color.segmentTrack, borderRadius: 7, padding: 3 }}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            flex: fill ? 1 : undefined,
            border: 0,
            cursor: 'pointer',
            borderRadius: 5,
            padding,
            font,
            color: color.ink,
            background: opt === value ? color.surface : 'transparent',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/** Read-only segmented display (project class) — matches the prototype, which
 *  renders it as a static control with a shadowed active pill. */
export function SegmentedStatic({ options, value }: { options: string[]; value: string }) {
  return (
    <div style={{ display: 'flex', background: color.segmentTrack, borderRadius: 7, padding: 3 }}>
      {options.map((opt) => (
        <span
          key={opt}
          style={{
            borderRadius: 5,
            padding: '5px 11px',
            font: sans('500 11.5px'),
            color: opt === value ? color.ink : color.muted,
            background: opt === value ? color.surface : undefined,
            boxShadow: opt === value ? '0 1px 2px rgba(0,0,0,.08)' : undefined,
          }}
        >
          {opt}
        </span>
      ))}
    </div>
  )
}

export type StepState = 'done' | 'active' | 'idle'

const stepGlyph: Record<StepState, string> = { done: '✓', active: '◐', idle: '○' }

/** One line of a processing checklist with its progress bar. */
export function ProgressStep({
  state,
  label,
  meta,
  progress,
  layout = 'stacked',
  labelWidth,
}: {
  state: StepState
  label: string
  meta?: string
  progress?: number
  /** `stacked` = bar under the label (spec parsing); `inline` = bar beside it (BQ) */
  layout?: 'stacked' | 'inline'
  labelWidth?: number
}) {
  const bar = (
    <div
      style={{
        height: 4,
        borderRadius: 3,
        background: state === 'done' ? color.greenOk : color.segmentTrack,
        marginTop: layout === 'stacked' ? 6 : undefined,
        overflow: 'hidden',
        flex: layout === 'inline' ? 1 : undefined,
      }}
    >
      {state === 'active' && (
        <div
          style={{
            width: `${progress ?? 0}%`,
            height: '100%',
            background: color.greenLeaf,
            animation: 'barfill 1.2s ease-out',
          }}
        />
      )}
    </div>
  )

  const glyphColor =
    state === 'done' ? color.greenOk : state === 'active' ? color.green : undefined

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: layout === 'stacked' ? 11 : 10,
        opacity: state === 'idle' ? 0.45 : undefined,
      }}
    >
      <span
        style={{
          width: layout === 'stacked' ? 16 : 14,
          color: glyphColor,
          font: mono('500 ' + (layout === 'stacked' ? '12px' : '11px')),
        }}
      >
        {stepGlyph[state]}
      </span>
      {layout === 'stacked' ? (
        <>
          <div style={{ flex: 1 }}>
            <div style={{ font: sans('500 12.5px') }}>{label}</div>
            {bar}
          </div>
          <span style={{ font: mono('400 11px'), color: color.faint }}>{meta}</span>
        </>
      ) : (
        <>
          <span style={{ width: labelWidth ?? 190, font: sans('500 12px') }}>{label}</span>
          {bar}
        </>
      )}
    </div>
  )
}

/** Neutral placeholder while an endpoint is in flight. */
export function LoadingPanel({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div
      style={{
        background: color.surface,
        border: `1px solid ${color.border}`,
        borderRadius: 10,
        padding: '46px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: color.greenLeaf,
              animation: `pulse-soft 1.1s ease-in-out ${i * 0.16}s infinite`,
            }}
          />
        ))}
      </div>
      <div style={{ font: mono('400 11.5px'), color: color.faint }}>{label}</div>
    </div>
  )
}

export function ErrorPanel({ error }: { error: Error }) {
  return (
    <div
      style={{
        background: color.redPanelBg,
        border: `1px solid ${color.redPanelBorder}`,
        borderRadius: 10,
        padding: '18px 20px',
      }}
    >
      <div style={{ font: sans('600 12.5px'), color: color.redText }}>Data gagal dimuat</div>
      <div style={{ font: sans('400 12px/1.6'), color: color.redPanelText, marginTop: 4 }}>
        {error.message}
      </div>
    </div>
  )
}

/** Card header row: title, optional meta, optional right-hand slot. */
export function CardTitle({
  title,
  meta,
  right,
  style,
}: {
  title: ReactNode
  meta?: ReactNode
  right?: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        padding: '12px 15px',
        borderBottom: `1px solid ${color.borderSoft}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        ...style,
      }}
    >
      <div style={{ font: sans('600 12.5px') }}>{title}</div>
      {meta && <span style={{ font: mono('400 11px'), color: color.faint }}>{meta}</span>}
      {right && (
        <>
          <div style={{ flex: 1 }} />
          {right}
        </>
      )}
    </div>
  )
}
