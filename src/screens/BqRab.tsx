import { useEffect, useRef, useState } from 'react'
import { fetchBq, keys, recalcHeader, recalculateBq, recalcSteps } from '@/api'
import { aiBannerText } from '@/data/cost'
import { AiBanner } from '@/components/AiBanner'
import { Chip, ErrorPanel, LoadingPanel, ProgressStep } from '@/components/primitives'
import { useResource } from '@/hooks/useResource'
import { btnGhost, btnPrimary, card, cardClipped, table, th, theadRow } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { ChipTone } from '@/theme/styles'
import type { BqData, BqDivision, Confidence, RecapRow, ScreenId } from '@/types'

type Tab = 'bq' | 'rek' | 'ver'

const tabs: { id: Tab; label: string }[] = [
  { id: 'bq', label: 'BQ per divisi' },
  { id: 'rek', label: 'Rekapitulasi RAB' },
  { id: 'ver', label: 'Versi & perbandingan' },
]

const confidenceTone: Record<Confidence, ChipTone> = {
  Tinggi: 'green',
  Sedang: 'amber',
  'Perlu verifikasi': 'red',
}

export function BqRab({
  projectId,
  showAiBanner,
  onOpenVolume,
  onNavigate,
}: {
  projectId: string
  showAiBanner: boolean
  onOpenVolume: (itemNo: string) => void
  onNavigate: (s: ScreenId) => void
}) {
  const { data, loading, error } = useResource<BqData>(keys.bq(projectId), () => fetchBq(projectId))
  const [tab, setTab] = useState<Tab>('bq')
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const [recalculating, setRecalculating] = useState(false)
  const job = useRef(0)

  /* Divisions carry their own default open/closed state from the API. */
  useEffect(() => {
    if (!data) return
    setOpen((prev) =>
      Object.keys(prev).length
        ? prev
        : Object.fromEntries(data.divisions.map((d) => [d.no, Boolean(d.defaultOpen)])),
    )
  }, [data])

  useEffect(() => {
    if (!recalculating) return
    const current = ++job.current
    let alive = true
    recalculateBq(projectId).then(() => {
      if (alive && job.current === current) setRecalculating(false)
    })
    return () => {
      alive = false
    }
  }, [recalculating, projectId])

  if (loading) return <LoadingPanel />
  if (error) return <ErrorPanel error={error} />
  if (!data) return null

  const toggle = (no: number) => setOpen((prev) => ({ ...prev, [no]: !prev[no] }))

  return (
    <>
      {showAiBanner && <AiBanner text={aiBannerText} marginBottom={14} />}

      <div
        style={{
          ...card,
          padding: '14px 16px',
          marginBottom: 14,
          display: 'flex',
          gap: 26,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ font: mono('400 10.5px'), color: color.faint }}>SUMBER GAMBAR</div>
          <div style={{ font: sans('500 12.5px'), marginTop: 4 }}>
            {data.source.drawings}{' '}
            <span style={{ font: mono('400 10.5px'), color: color.greenText }}>
              {data.source.drawingsNote}
            </span>
          </div>
        </div>
        <div style={{ width: 1, height: 30, background: color.borderSoft }} />
        <div>
          <div style={{ font: mono('400 10.5px'), color: color.faint }}>SUMBER HARGA</div>
          <div style={{ font: sans('500 12.5px'), marginTop: 4 }}>{data.source.prices}</div>
        </div>
        <div style={{ width: 1, height: 30, background: color.borderSoft }} />
        <div>
          <div style={{ font: mono('400 10.5px'), color: color.faint }}>OH &amp; PROFIT · PPN</div>
          <div style={{ font: sans('500 12.5px'), marginTop: 4 }}>{data.source.ohProfit}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn-ghost" style={btnGhost}>
          Atur asumsi
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setRecalculating(true)}
          style={btnPrimary}
        >
          Hitung ulang volume &amp; BQ
        </button>
      </div>

      {recalculating && (
        <div
          style={{
            ...card,
            padding: '22px 24px',
            marginBottom: 14,
            display: 'flex',
            gap: 26,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 220 }}>
            <div style={{ font: sans('600 13px') }}>{recalcHeader.title}</div>
            <div style={{ font: mono('400 11px'), color: color.faint, marginTop: 4 }}>
              {recalcHeader.meta}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 320,
              display: 'flex',
              flexDirection: 'column',
              gap: 11,
            }}
          >
            {recalcSteps.map((step) => (
              <ProgressStep
                key={step.label}
                state={step.state}
                label={step.label}
                progress={'progress' in step ? step.progress : undefined}
                layout="inline"
              />
            ))}
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              job.current++
              setRecalculating(false)
            }}
            style={{ ...btnGhost, color: color.muted }}
          >
            Batalkan
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: `1px solid ${color.border}` }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              padding: '9px 14px',
              font: sans('500 12.5px'),
              color: color.ink,
              borderBottom: `2px solid ${tab === t.id ? color.green : 'transparent'}`,
            }}
          >
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8, paddingBottom: 6 }}>
          <button
            type="button"
            className="btn-tint"
            style={{
              border: `1px solid ${color.greenLine}`,
              background: color.greenTint,
              color: color.green,
              cursor: 'pointer',
              borderRadius: 7,
              padding: '7px 13px',
              font: sans('500 12px'),
            }}
          >
            Ekspor Excel
          </button>
          <button type="button" className="btn-ghost" style={{ ...btnGhost, padding: '7px 13px' }}>
            Ekspor PDF
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => onNavigate('cost')}
            style={{ ...btnGhost, padding: '7px 13px' }}
          >
            Kirim ke Build Up Cost
          </button>
        </div>
      </div>

      {tab === 'bq' && (
        <BqTab data={data} open={open} onToggle={toggle} onOpenVolume={onOpenVolume} />
      )}
      {tab === 'rek' && <RecapTab data={data} />}
      {tab === 'ver' && <VersionsTab data={data} />}
    </>
  )
}

function BqTab({
  data,
  open,
  onToggle,
  onOpenVolume,
}: {
  data: BqData
  open: Record<number, boolean>
  onToggle: (no: number) => void
  onOpenVolume: (itemNo: string) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 14, alignItems: 'start' }}>
      <div style={cardClipped}>
        <table style={table}>
          <thead>
            <tr style={theadRow}>
              <th style={th({ padding: '9px 14px', width: 58 })}>NO.</th>
              <th style={th()}>URAIAN PEKERJAAN</th>
              <th style={th({ width: 52 })}>SAT.</th>
              <th style={th({ textAlign: 'right', width: 92 })}>VOLUME</th>
              <th style={th({ textAlign: 'right', width: 104 })}>HARGA SAT.</th>
              <th style={th({ textAlign: 'right', width: 126 })}>JUMLAH HARGA</th>
              <th style={th({ padding: '9px 14px', width: 118 })}>KEYAKINAN</th>
            </tr>
          </thead>
          <tbody>
            {data.divisions.map((div) => (
              <DivisionRows
                key={div.no}
                division={div}
                open={Boolean(open[div.no])}
                onToggle={() => onToggle(div.no)}
                onOpenVolume={onOpenVolume}
              />
            ))}
          </tbody>
          <tfoot>
            <tr style={{ position: 'sticky', bottom: 0, background: color.sidebarDark, color: '#F1F2EB' }}>
              <td style={{ padding: '13px 14px' }} colSpan={5}>
                <span style={{ font: sans('600 12.5px') }}>{data.grandTotal.label}</span>
                <span style={{ font: mono('400 11px'), color: color.onDarkMuted, marginLeft: 10 }}>
                  {data.grandTotal.meta}
                </span>
              </td>
              <td style={{ padding: '13px 8px', textAlign: 'right', font: mono('600 14px') }}>
                {data.grandTotal.amount}
              </td>
              <td style={{ padding: '13px 14px' }} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, padding: '15px 16px' }}>
          <div style={{ font: sans('600 12.5px'), marginBottom: 10 }}>Peringatan</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, font: sans('400 11.5px/1.55') }}>
            {data.warnings.map((wrn) => (
              <div key={wrn.text} style={{ display: 'flex', gap: 9 }}>
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: wrn.severity === 'critical' ? color.red : color.amber,
                    marginTop: 6,
                    flex: 'none',
                  }}
                />
                <div>{wrn.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, padding: '15px 16px' }}>
          <div style={{ font: sans('600 12.5px'), marginBottom: 10 }}>Keyakinan</div>
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
            {data.confidence.segments.map((s) => (
              <div key={s.color} style={{ width: `${s.pct}%`, background: s.color }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, font: sans('400 11.5px') }}>
            {data.confidence.rows.map((r) => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{r.label}</span>
                <span style={{ font: mono('500 11.5px') }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DivisionRows({
  division,
  open,
  onToggle,
  onOpenVolume,
}: {
  division: BqDivision
  open: boolean
  onToggle: () => void
  onOpenVolume: (itemNo: string) => void
}) {
  const expandable = !division.collapsedOnly
  const caret = expandable ? (open ? '▾' : '▸') : '▸'

  return (
    <>
      <tr
        onClick={expandable ? onToggle : undefined}
        style={{
          background: color.greenRow,
          cursor: expandable ? 'pointer' : undefined,
          borderBottom: `1px solid ${color.borderSoft}`,
        }}
      >
        <td style={{ padding: '10px 14px', font: mono('600 12px') }}>{division.no}</td>
        <td style={{ padding: '10px 8px', fontWeight: 600 }} colSpan={4}>
          {caret} {division.title}
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'right', font: mono('600 12px') }}>
          {division.amount}
        </td>
        <td style={{ padding: '10px 14px' }} />
      </tr>

      {expandable &&
        open &&
        division.items.map((item) => (
          <tr
            key={item.no}
            className={item.highlight ? 'row-hover-green' : 'row-hover'}
            onClick={() => onOpenVolume(item.no)}
            style={{
              borderBottom: `1px solid ${color.rowLine}`,
              cursor: 'pointer',
              background: item.highlight ? '#FBFCF7' : undefined,
            }}
          >
            <td style={{ padding: '9px 14px', font: mono('400 11.5px'), color: color.faint }}>
              {item.no}
            </td>
            <td style={{ padding: '9px 8px' }}>{item.description}</td>
            <td style={{ padding: '9px 8px', font: mono('400 11.5px') }}>{item.unit}</td>
            <td
              style={{
                padding: '9px 8px',
                textAlign: 'right',
                font: mono('500 12px'),
                color: color.green,
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
              }}
            >
              {item.volume}
            </td>
            <td style={{ padding: '9px 8px', textAlign: 'right', font: mono('400 12px') }}>
              {item.unitPrice}
            </td>
            <td style={{ padding: '9px 8px', textAlign: 'right', font: mono('500 12px') }}>
              {item.amount}
            </td>
            <td style={{ padding: '9px 14px' }}>
              <Chip tone={confidenceTone[item.confidence]}>{item.confidence}</Chip>
            </td>
          </tr>
        ))}

      {expandable && open && division.restLabel && (
        <tr style={{ borderBottom: `1px solid ${color.rowLine}` }}>
          <td style={{ padding: '9px 14px' }} />
          <td style={{ padding: '9px 8px', color: color.faint, fontStyle: 'italic' }} colSpan={4}>
            {division.restLabel}
          </td>
          <td style={{ padding: '9px 8px', textAlign: 'right', font: mono('500 12px'), color: color.muted }}>
            {division.restAmount}
          </td>
          <td style={{ padding: '9px 14px' }} />
        </tr>
      )}
    </>
  )
}

function RecapTab({ data }: { data: BqData }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 14, alignItems: 'start' }}>
      <div style={cardClipped}>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: sans('400 12.5px') }}>
          <thead>
            <tr style={theadRow}>
              <th style={th({ padding: '10px 16px' })}>URAIAN</th>
              <th style={th({ padding: '10px 16px', textAlign: 'right' })}>JUMLAH (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {data.recap.map((row) => (
              <RecapTr key={row.label} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, padding: '16px 17px' }}>
          <div style={{ font: sans('500 11px'), color: color.muted }}>Cost per m² hasil akhir</div>
          <div style={{ font: mono('600 26px/1.15'), margin: '8px 0 6px', letterSpacing: '-.02em' }}>
            {data.finalPerM2.value}
          </div>
          <div style={{ font: mono('400 11px/1.6'), color: color.faint, whiteSpace: 'pre-line' }}>
            {data.finalPerM2.note}
          </div>
        </div>
        <div
          style={{
            ...card,
            padding: '16px 17px',
            font: sans('400 11.5px/1.6'),
            color: color.muted,
          }}
        >
          {data.recapNote}
        </div>
      </div>
    </div>
  )
}

function RecapTr({ row }: { row: RecapRow }) {
  if (row.emphasis === 'final') {
    return (
      <tr style={{ background: color.sidebarDark, color: '#F1F2EB' }}>
        <td style={{ padding: '15px 16px', font: sans('600 14px') }}>{row.label}</td>
        <td style={{ padding: '15px 16px', textAlign: 'right', font: mono('600 17px') }}>
          {row.amount}
        </td>
      </tr>
    )
  }

  const strong = row.emphasis === 'sub' || row.emphasis === 'total'
  return (
    <tr
      style={{
        borderBottom: `1px solid ${row.emphasis === 'total' ? color.border : color.rowLine}`,
        background: strong ? color.surfaceMuted : undefined,
      }}
    >
      <td style={{ padding: '11px 16px', fontWeight: strong ? 600 : undefined }}>{row.label}</td>
      <td
        style={{
          padding: '11px 16px',
          textAlign: 'right',
          font: mono(`${strong ? 600 : 500} 12.5px`),
        }}
      >
        {row.amount}
      </td>
    </tr>
  )
}

function VersionsTab({ data }: { data: BqData }) {
  const { versions } = data
  return (
    <div style={cardClipped}>
      <div
        style={{
          padding: '13px 16px',
          borderBottom: `1px solid ${color.borderSoft}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ font: sans('600 12.5px') }}>{versions.title}</div>
        <span style={{ font: mono('400 11px'), color: color.faint }}>{versions.meta}</span>
      </div>
      <table style={table}>
        <thead>
          <tr style={theadRow}>
            <th style={th({ padding: '9px 16px' })}>ITEM</th>
            <th style={th({ textAlign: 'right' })}>v1</th>
            <th style={th({ textAlign: 'right' })}>v2</th>
            <th style={th({ textAlign: 'right' })}>SELISIH</th>
            <th style={th({ padding: '9px 16px' })}>SEBAB</th>
          </tr>
        </thead>
        <tbody>
          {versions.rows.map((row, i) => (
            <tr
              key={row.item}
              style={{
                borderBottom:
                  i === versions.rows.length - 1 ? undefined : `1px solid ${color.rowLine}`,
              }}
            >
              <td style={{ padding: '10px 16px' }}>{row.item}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right', font: mono('400 12px') }}>
                {row.v1}
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', font: mono('500 12px') }}>
                {row.v2}
              </td>
              <td
                style={{
                  padding: '10px 8px',
                  textAlign: 'right',
                  font: mono('600 12px'),
                  color: row.deltaColor,
                }}
              >
                {row.delta}
              </td>
              <td style={{ padding: '10px 16px', color: color.muted }}>{row.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{
          padding: '12px 16px',
          borderTop: `1px solid ${color.border}`,
          background: color.surfaceMuted,
          display: 'flex',
          justifyContent: 'space-between',
          font: sans('600 12.5px'),
        }}
      >
        <span>Selisih total v1 → v2</span>
        <span style={{ font: mono('600 13px'), color: color.greenOk }}>{versions.totalDelta}</span>
      </div>
    </div>
  )
}
