import { useEffect, useRef, useState } from 'react'
import {
  emptyState,
  fetchSpesifikasi,
  keys,
  parseHeader,
  parseSpecDocuments,
  parseSteps,
  partialError,
} from '@/api'
import {
  Chip,
  ErrorPanel,
  LoadingPanel,
  ProgressStep,
  SegmentedStatic,
} from '@/components/primitives'
import { useResource } from '@/hooks/useResource'
import {
  btnPrimary,
  card,
  cardClipped,
  screenSub,
  screenTitle,
  table,
  th,
  theadRow,
  type ChipTone,
} from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { MaterialRow, MaterialStatus, ScreenId, SpecData, SpecScreenState } from '@/types'

const stateLabels = { full: 'Terisi', empty: 'Kosong', load: 'Memproses', err: 'Parsial' } as const
type StateLabel = (typeof stateLabels)[keyof typeof stateLabels]

const labelToState: Record<StateLabel, SpecScreenState> = {
  Terisi: 'full',
  Kosong: 'empty',
  Memproses: 'load',
  Parsial: 'err',
}

const rowTint: Record<MaterialStatus, { bg?: string; hover: string }> = {
  clear: { hover: 'row-hover' },
  ambiguous: { bg: color.amberRow, hover: 'row-hover-amber' },
  overspec: { bg: color.amberRow, hover: 'row-hover-amber' },
  unavailable: { bg: color.redRow, hover: 'row-hover-red' },
}

const statusTone: Record<MaterialStatus, ChipTone> = {
  clear: 'green',
  ambiguous: 'amber',
  overspec: 'amber',
  unavailable: 'red',
}

export function Spesifikasi({
  projectId,
  onNavigate,
}: {
  projectId: string
  onNavigate: (s: ScreenId) => void
}) {
  const { data, loading, error } = useResource<SpecData>(keys.spesifikasi(projectId), () =>
    fetchSpesifikasi(projectId),
  )
  const [screenState, setScreenState] = useState<SpecScreenState>('full')
  const parseJob = useRef(0)

  /** Kick off a (mock) parse run; the UI shows step progress until it resolves. */
  useEffect(() => {
    if (screenState !== 'load') return
    const job = ++parseJob.current
    let alive = true
    parseSpecDocuments(projectId).then(() => {
      if (alive && parseJob.current === job) setScreenState('full')
    })
    return () => {
      alive = false
    }
  }, [screenState, projectId])

  const cancelParse = () => {
    parseJob.current++
    setScreenState('full')
  }

  const showTable = screenState === 'full' || screenState === 'err'

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 20,
          marginBottom: 18,
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <div style={screenTitle}>Spesifikasi &amp; Material</div>
          <div style={screenSub}>
            Spesifikasi dan material yang diminta itu sebenarnya apa, wajar tidak, dan ada
            alternatifnya tidak?
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: color.segmentTrack,
            borderRadius: 8,
            padding: 3,
          }}
        >
          {(Object.values(stateLabels) as StateLabel[]).map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setScreenState(labelToState[label])}
              style={{
                border: 0,
                cursor: 'pointer',
                borderRadius: 6,
                padding: '6px 11px',
                font: mono('500 11px'),
                color: color.ink,
                background: stateLabels[screenState] === label ? color.surface : 'transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingPanel />}
      {error && <ErrorPanel error={error} />}

      {screenState === 'empty' && <EmptyState onUpload={() => setScreenState('load')} />}

      {screenState === 'load' && <ParsingState onCancel={cancelParse} />}

      {screenState === 'err' && (
        <PartialBanner onRetry={() => setScreenState('load')} onContinue={() => setScreenState('full')} />
      )}

      {showTable && data && <SpecTable data={data} onNavigate={onNavigate} />}
    </>
  )
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div
      style={{
        ...card,
        padding: '64px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        textAlign: 'center',
      }}
    >
      <svg width="150" height="96" viewBox="0 0 150 96" role="img" aria-label="Placeholder dokumen">
        <defs>
          <pattern
            id="stripe-empty"
            width="7"
            height="7"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <rect width="3.2" height="7" fill="#E9E9E1" />
          </pattern>
        </defs>
        <rect x="30" y="6" width="66" height="84" rx="4" fill="url(#stripe-empty)" stroke="#DCDCD3" />
        <rect x="54" y="24" width="66" height="60" rx="4" fill="#FFFFFF" stroke="#DCDCD3" />
        <rect x="64" y="38" width="46" height="4" rx="2" fill="#E4E4DE" />
        <rect x="64" y="50" width="36" height="4" rx="2" fill="#E4E4DE" />
        <rect x="64" y="62" width="42" height="4" rx="2" fill="#E4E4DE" />
      </svg>
      <div style={{ font: sans('600 14px') }}>{emptyState.title}</div>
      <div style={{ font: sans('400 12.5px/1.6'), color: color.muted, maxWidth: 340 }}>
        {emptyState.body}
      </div>
      <button
        type="button"
        className="btn-primary"
        onClick={onUpload}
        style={{ ...btnPrimary, marginTop: 4, padding: '9px 18px', font: sans('500 12.5px') }}
      >
        {emptyState.cta}
      </button>
    </div>
  )
}

function ParsingState({ onCancel }: { onCancel: () => void }) {
  return (
    <div style={{ ...card, padding: '40px 32px', maxWidth: 620, margin: '0 auto' }}>
      <div style={{ font: sans('600 13.5px'), marginBottom: 5 }}>{parseHeader.title}</div>
      <div style={{ font: mono('400 11.5px'), color: color.faint, marginBottom: 22 }}>
        {parseHeader.meta}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {parseSteps.map((step) => (
          <ProgressStep
            key={step.label}
            state={step.state}
            label={step.label}
            meta={step.meta}
            progress={'progress' in step ? step.progress : undefined}
          />
        ))}
      </div>
      <button
        type="button"
        className="btn-ghost"
        onClick={onCancel}
        style={{
          marginTop: 26,
          border: `1px solid ${color.border}`,
          background: color.surfaceSoft,
          cursor: 'pointer',
          borderRadius: 7,
          padding: '8px 15px',
          font: sans('500 12px'),
          color: color.muted,
        }}
      >
        Batalkan proses
      </button>
    </div>
  )
}

function PartialBanner({ onRetry, onContinue }: { onRetry: () => void; onContinue: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        background: color.redPanelBg,
        border: `1px solid ${color.redPanelBorder}`,
        borderRadius: 10,
        padding: '15px 17px',
        marginBottom: 16,
      }}
    >
      <span style={{ font: mono('500 13px'), color: color.red, marginTop: 1 }}>!</span>
      <div style={{ flex: 1 }}>
        <div style={{ font: sans('600 12.5px'), color: color.redText }}>{partialError.title}</div>
        <div style={{ font: sans('400 12px/1.6'), color: color.redPanelText, marginTop: 4 }}>
          {partialError.body}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
          <button
            type="button"
            onClick={onRetry}
            style={{
              border: 0,
              cursor: 'pointer',
              background: color.red,
              color: color.surface,
              borderRadius: 6,
              padding: '7px 14px',
              font: sans('500 12px'),
            }}
          >
            Coba lagi halaman gagal
          </button>
          <button
            type="button"
            onClick={onContinue}
            style={{
              border: `1px solid ${color.redPanelBorder}`,
              cursor: 'pointer',
              background: 'transparent',
              color: color.redText,
              borderRadius: 6,
              padding: '7px 14px',
              font: sans('500 12px'),
            }}
          >
            Lanjut dengan hasil parsial
          </button>
        </div>
      </div>
    </div>
  )
}

function SpecTable({ data, onNavigate }: { data: SpecData; onNavigate: (s: ScreenId) => void }) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          ...card,
          padding: '13px 15px',
          marginBottom: 16,
        }}
      >
        <button type="button" className="btn-primary" style={btnPrimary}>
          ＋ Upload dokumen
        </button>
        <div style={{ display: 'flex', gap: 7, font: mono('400 11px'), color: color.muted }}>
          {data.documents.map((doc) => (
            <span
              key={doc}
              style={{ border: `1px solid ${color.border}`, borderRadius: 5, padding: '5px 9px' }}
            >
              {doc}
            </span>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ font: sans('500 11px'), color: color.muted }}>Kelas proyek</span>
        <SegmentedStatic options={data.projectClasses} value={data.activeClass} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
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
            <div style={{ font: sans('600 12.5px') }}>Material terstruktur</div>
            <span style={{ font: mono('400 11px'), color: color.faint }}>
              {data.itemCount} item · {data.divisionCount} divisi
            </span>
            <div style={{ flex: 1 }} />
            <span style={pillBtn}>Cari item…</span>
            <span style={pillBtn}>Filter ▾</span>
            <span
              style={{
                font: sans('500 11px'),
                color: color.green,
                border: `1px solid ${color.greenLine}`,
                borderRadius: 5,
                padding: '5px 9px',
              }}
            >
              Ekspor Excel
            </span>
          </div>

          <table style={table}>
            <thead>
              <tr style={theadRow}>
                <th style={th({ padding: '9px 14px' })}>DIVISI</th>
                <th style={th()}>ITEM</th>
                <th style={th()}>SPESIFIKASI</th>
                <th style={th()}>STANDAR</th>
                <th style={th({ textAlign: 'right' })}>VOLUME</th>
                <th style={th({ padding: '9px 14px' })}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {data.materials.map((row) => (
                <MaterialTr key={row.id} row={row} />
              ))}
            </tbody>
          </table>
          <div
            style={{
              padding: '11px 15px',
              borderTop: `1px solid ${color.borderSoft}`,
              font: mono('400 11px'),
              color: color.faint,
            }}
          >
            Menampilkan {data.shownCount} dari {data.itemCount} item
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={cardClipped}>
            <div
              style={{
                padding: '12px 15px',
                borderBottom: `1px solid ${color.borderSoft}`,
                font: sans('600 12.5px'),
              }}
            >
              Temuan{' '}
              <span style={{ font: mono('400 11px'), color: color.faint }}>
                {data.openFindings} terbuka
              </span>
            </div>
            {data.findings.map((f, i) => (
              <div
                key={f.title}
                style={{
                  padding: '12px 15px',
                  borderBottom:
                    i === data.findings.length - 1 ? undefined : `1px solid ${color.rowLine}`,
                }}
              >
                <div style={{ font: sans('500 12px/1.45') }}>{f.title}</div>
                <div style={{ font: sans('400 11.5px/1.55'), color: color.muted, marginTop: 3 }}>
                  {f.body}
                </div>
              </div>
            ))}
          </div>

          <div style={cardClipped}>
            <div style={{ padding: '12px 15px', borderBottom: `1px solid ${color.borderSoft}` }}>
              <div style={{ font: sans('600 12.5px') }}>Alternatif material</div>
              <div style={{ font: mono('400 11px'), color: color.faint, marginTop: 3 }}>
                {data.alternativesFor}
              </div>
            </div>
            {data.alternatives.map((alt) => (
              <div
                key={alt.name}
                style={{
                  padding: '12px 15px',
                  borderBottom: `1px solid ${color.rowLine}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ font: sans('500 12px') }}>{alt.name}</span>
                  <span style={{ font: mono('600 12px'), color: color.greenOk }}>{alt.delta}</span>
                </div>
                <div style={{ font: mono('400 11px/1.5'), color: color.faint }}>{alt.availability}</div>
                <div style={{ font: sans('400 11.5px/1.5'), color: color.muted }}>{alt.note}</div>
              </div>
            ))}
            <div style={{ padding: '12px 15px' }}>
              <button
                type="button"
                className="btn-tint"
                onClick={() => onNavigate('cost')}
                style={{
                  width: '100%',
                  border: `1px solid ${color.greenLine}`,
                  background: color.greenTint,
                  color: color.green,
                  borderRadius: 7,
                  padding: 8,
                  cursor: 'pointer',
                  font: sans('500 12px'),
                }}
              >
                Kirim ke VE →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function MaterialTr({ row }: { row: MaterialRow }) {
  const tint = rowTint[row.status]
  return (
    <tr
      className={tint.hover}
      style={{ borderBottom: `1px solid ${color.rowLine}`, background: tint.bg }}
    >
      <td style={{ padding: '10px 14px', color: color.muted }}>{row.division}</td>
      <td style={{ padding: '10px 8px', fontWeight: 500 }}>{row.item}</td>
      <td style={{ padding: '10px 8px', color: color.inkSoft }}>{row.spec}</td>
      <td style={{ padding: '10px 8px', font: mono('400 11px'), color: color.faint }}>
        {row.standard}
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'right', font: mono('500 12px') }}>{row.volume}</td>
      <td style={{ padding: '10px 14px' }}>
        <Chip tone={statusTone[row.status]}>{row.statusLabel}</Chip>
      </td>
    </tr>
  )
}

const pillBtn = {
  font: mono('400 11px'),
  color: color.muted,
  border: `1px solid ${color.border}`,
  borderRadius: 5,
  padding: '5px 9px',
} as const
