import { useState } from 'react'
import { fetchCost, keys } from '@/api'
import { aiBannerText } from '@/data/cost'
import { requestVeSuggestions, type VeSuggestion } from '@/lib/ai'
import { AiBanner } from '@/components/AiBanner'
import { Field, Modal } from '@/components/Modal'
import { Chip, ErrorPanel, LoadingPanel } from '@/components/primitives'
import { useResource } from '@/hooks/useResource'
import { btnGhost, btnPrimary, card, cardClipped, table, th, theadRow, vRule } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { ChipTone } from '@/theme/styles'
import type { CostData, VeStatus } from '@/types'

const veStatusTone: Record<VeStatus, ChipTone> = {
  approved: 'green',
  proposed: 'neutral',
  deferred: 'amber',
  rejected: 'red',
}

export function BuildUpCost({
  projectId,
  showAiBanner,
  onOpenVe,
}: {
  projectId: string
  showAiBanner: boolean
  onOpenVe: (veId: string) => void
}) {
  const { data, loading, error } = useResource<CostData>(keys.cost(projectId), () =>
    fetchCost(projectId),
  )
  const [paramsOverride, setParamsOverride] = useState<{ label: string; value: string }[] | null>(
    null,
  )
  const [showParams, setShowParams] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  if (loading) return <LoadingPanel />
  if (error) return <ErrorPanel error={error} />
  if (!data) return null

  const { summary, breakdown, breakdownTotal, benchmark, ve } = data
  const params = paramsOverride ?? data.params

  return (
    <>
      {showAiBanner && <AiBanner text={aiBannerText} marginBottom={16} />}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: 16,
          alignItems: 'start',
          marginBottom: 16,
        }}
      >
        <div style={{ ...card, padding: '20px 22px' }}>
          <div style={{ display: 'flex', gap: 34, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ font: sans('500 11px'), color: color.muted }}>Cost per m²</div>
              <div style={{ font: mono('600 38px/1.1'), letterSpacing: '-.03em', marginTop: 6 }}>
                {summary.perM2}
              </div>
              <div style={{ font: mono('400 11.5px'), color: color.faint, marginTop: 5 }}>
                {summary.perM2Note}
              </div>
            </div>
            <div style={vRule} />
            <div>
              <div style={{ font: sans('500 11px'), color: color.muted }}>Total Estimasi Biaya</div>
              <div style={{ font: mono('600 38px/1.1'), letterSpacing: '-.03em', marginTop: 6 }}>
                {summary.total}
              </div>
              <div style={{ font: mono('400 11.5px'), color: color.faint, marginTop: 5 }}>
                {summary.totalRange}
              </div>
            </div>
            <div style={vRule} />
            <div style={{ font: mono('400 11.5px/1.9'), color: color.muted }}>
              luas bangunan <span style={{ color: color.ink }}>2.996 m²</span>
              <br />
              {summary.facts.slice(1).map((f) => (
                <span key={f}>
                  {f}
                  <br />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...card, padding: '16px 17px' }}>
          <div style={{ font: sans('600 12.5px'), marginBottom: 12 }}>Parameter estimasi</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, font: sans('400 11.5px') }}>
            {params.map((p) => (
              <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ color: color.muted }}>{p.label}</span>
                <span style={{ font: mono('500 11.5px') }}>{p.value}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setShowParams(true)}
            style={{ ...btnGhost, width: '100%', marginTop: 14, padding: 8 }}
          >
            Ubah parameter
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: 16,
          alignItems: 'start',
          marginBottom: 16,
        }}
      >
        <div style={cardClipped}>
          <div
            style={{
              padding: '13px 16px',
              borderBottom: `1px solid ${color.borderSoft}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ font: sans('600 12.5px') }}>Breakdown build up cost</div>
            <div style={{ flex: 1 }} />
            <span style={{ font: mono('400 11px'), color: color.faint }}>{data.breakdownBasis}</span>
          </div>

          <div style={{ padding: '16px 16px 6px' }}>
            <div style={{ display: 'flex', height: 16, borderRadius: 4, overflow: 'hidden' }}>
              {breakdown.map((b) => (
                <div key={b.component} style={{ width: `${b.sharePct}%`, background: b.barColor }} />
              ))}
            </div>
          </div>

          <table style={table}>
            <thead>
              <tr>
                <th style={th({ padding: '9px 16px' })}>KOMPONEN</th>
                <th style={th()}>ISI</th>
                <th style={th({ textAlign: 'right' })}>PORSI</th>
                <th style={th({ textAlign: 'right' })}>TIPIKAL</th>
                <th style={th({ textAlign: 'right', padding: '9px 16px' })}>BIAYA (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((b, i) => (
                <tr
                  key={b.component}
                  style={{
                    borderBottom:
                      i === breakdown.length - 1 ? undefined : `1px solid ${color.rowLine}`,
                  }}
                >
                  <td style={{ padding: '9px 16px', fontWeight: 500 }}>{b.component}</td>
                  <td style={{ padding: '9px 8px', color: color.muted, fontSize: 11.5 }}>
                    {b.contents}
                  </td>
                  <td style={{ padding: '9px 8px', textAlign: 'right', font: mono('500 12px') }}>
                    {b.share}
                  </td>
                  <td
                    style={{
                      padding: '9px 8px',
                      textAlign: 'right',
                      font: mono('400 11px'),
                      color: color.faint,
                    }}
                  >
                    {b.typical}
                  </td>
                  <td style={{ padding: '9px 16px', textAlign: 'right', font: mono('500 12px') }}>
                    {b.cost}
                  </td>
                </tr>
              ))}
              <tr style={{ background: color.surfaceMuted, borderTop: `1px solid ${color.border}` }}>
                <td style={{ padding: '11px 16px', fontWeight: 600 }}>Total</td>
                <td />
                <td style={{ padding: '11px 8px', textAlign: 'right', font: mono('600 12px') }}>
                  {breakdownTotal.share}
                </td>
                <td />
                <td style={{ padding: '11px 16px', textAlign: 'right', font: mono('600 12.5px') }}>
                  {breakdownTotal.cost}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ ...card, padding: '16px 17px' }}>
          <div style={{ font: sans('600 12.5px'), marginBottom: 4 }}>{benchmark.title}</div>
          <div style={{ font: mono('400 11px'), color: color.faint, marginBottom: 14 }}>
            {benchmark.subtitle}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {benchmark.bars.map((bar) => (
              <div key={bar.label}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    font: sans('500 11.5px'),
                    marginBottom: 5,
                  }}
                >
                  <span style={{ color: bar.muted ? color.muted : undefined }}>{bar.label}</span>
                  <span style={{ font: mono('600 11.5px'), color: bar.muted ? color.muted : undefined }}>
                    {bar.value}
                  </span>
                </div>
                <div style={{ height: 9, borderRadius: 5, background: color.segmentTrack }}>
                  <div
                    style={{
                      width: `${bar.pct}%`,
                      height: '100%',
                      borderRadius: 5,
                      background: bar.color,
                    }}
                  />
                </div>
              </div>
            ))}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  font: sans('500 11.5px'),
                  marginBottom: 5,
                }}
              >
                <span style={{ color: color.muted }}>{benchmark.marketRange.label}</span>
                <span style={{ font: mono('600 11.5px'), color: color.muted }}>
                  {benchmark.marketRange.value}
                </span>
              </div>
              <div
                style={{
                  height: 9,
                  borderRadius: 5,
                  background: color.segmentTrack,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${benchmark.marketRange.from}%`,
                    width: `${benchmark.marketRange.width}%`,
                    height: '100%',
                    borderRadius: '0 5px 5px 0',
                    background: color.greenMist,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: `${benchmark.marketRange.marker}%`,
                    width: 2,
                    height: '100%',
                    background: color.green,
                  }}
                />
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: 7,
              background: color.greenTint,
              font: sans('400 11.5px/1.55'),
              color: color.greenText,
            }}
          >
            {benchmark.note}
          </div>
        </div>
      </div>

      <div style={cardClipped}>
        <div
          style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${color.borderSoft}`,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ font: sans('600 12.5px') }}>Value Engineering</div>
            <div style={{ font: mono('400 11px'), color: color.faint, marginTop: 3 }}>
              {ve.count} usulan · urut dari penghematan terbesar
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            <div>
              <div style={{ font: mono('400 10.5px'), color: color.faint }}>TOTAL POTENSI SAVING</div>
              <div style={{ font: mono('600 16px'), color: color.greenOk, marginTop: 2 }}>
                {ve.totalSaving}{' '}
                <span style={{ fontSize: 11, color: color.muted }}>{ve.totalSavingPct}</span>
              </div>
            </div>
            <div>
              <div style={{ font: mono('400 10.5px'), color: color.faint }}>SUDAH DISETUJUI</div>
              <div style={{ font: mono('600 16px'), marginTop: 2 }}>
                {ve.approvedSaving}{' '}
                <span style={{ fontSize: 11, color: color.muted }}>{ve.approvedSavingPct}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setAiOpen(true)}
              style={{ ...btnPrimary, padding: '9px 15px' }}
            >
              ✦ Minta usulan VE dari AI
            </button>
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderBottom: `1px solid ${color.borderSoft}`,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 6,
            height: 132,
          }}
        >
          {ve.waterfall.map((step) => (
            <div
              key={step.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                width: step.width,
              }}
            >
              {step.kind === 'bar' ? (
                <div
                  style={{
                    width: '100%',
                    height: step.height,
                    background: step.color,
                    borderRadius: 3,
                    border: step.dashed ? `1px dashed ${color.greenSage}` : undefined,
                  }}
                />
              ) : (
                <div style={{ width: '100%', height: 96, position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: step.bottom,
                      width: '100%',
                      height: step.height,
                      background: step.color,
                      borderRadius: 2,
                    }}
                  />
                </div>
              )}
              <div style={{ font: mono('400 10.5px'), color: color.muted, textAlign: 'center' }}>
                {step.label}
                <br />
                <span style={{ color: step.valueColor ?? color.ink }}>{step.value}</span>
              </div>
            </div>
          ))}
          <div style={{ flex: 1 }} />
        </div>

        <table style={table}>
          <thead>
            <tr style={theadRow}>
              <th style={th({ padding: '9px 16px' })}>ITEM PEKERJAAN</th>
              <th style={th()}>KONDISI AWAL → USULAN</th>
              <th style={th({ textAlign: 'right' })}>PENGHEMATAN ↓</th>
              <th style={th()}>MUTU</th>
              <th style={th()}>WAKTU</th>
              <th style={th({ padding: '9px 16px' })}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {ve.rows.map((row, i) => (
              <tr
                key={row.id}
                className="row-hover"
                onClick={() => onOpenVe(row.id)}
                style={{
                  borderBottom: i === ve.rows.length - 1 ? undefined : `1px solid ${color.rowLine}`,
                  cursor: 'pointer',
                  opacity: row.dimmed ? 0.6 : undefined,
                }}
              >
                <td style={{ padding: '10px 16px', fontWeight: 500 }}>{row.item}</td>
                <td style={{ padding: '10px 8px', color: color.inkSoft }}>{row.change}</td>
                <td
                  style={{
                    padding: '10px 8px',
                    textAlign: 'right',
                    font: mono('600 12px'),
                    color: row.savingMuted ? color.muted : color.greenOk,
                  }}
                >
                  {row.saving}
                  <div style={{ font: mono('400 10.5px'), color: color.faint }}>{row.savingPct}</div>
                </td>
                <td style={{ padding: '10px 8px', color: row.qualityColor }}>{row.quality}</td>
                <td style={{ padding: '10px 8px', color: row.timeColor }}>{row.time}</td>
                <td style={{ padding: '10px 16px' }}>
                  <Chip tone={veStatusTone[row.status]}>{row.statusLabel}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            padding: '11px 16px',
            borderTop: `1px solid ${color.borderSoft}`,
            font: mono('400 11px'),
            color: color.faint,
          }}
        >
          Klik baris untuk membuka detail usulan · usulan yang disetujui otomatis jadi skenario di
          menu Biaya–Mutu–Waktu
        </div>
      </div>

      {showParams && (
        <ParamsModal
          initial={params}
          onClose={() => setShowParams(false)}
          onSave={(v) => {
            setParamsOverride(v)
            setShowParams(false)
          }}
        />
      )}
      {aiOpen && (
        <AiVeModal
          projectId={projectId}
          context={ve.rows.map((r) => `${r.item}: ${r.change}`)}
          onClose={() => setAiOpen(false)}
        />
      )}
    </>
  )
}

function ParamsModal({
  initial,
  onClose,
  onSave,
}: {
  initial: { label: string; value: string }[]
  onClose: () => void
  onSave: (v: { label: string; value: string }[]) => void
}) {
  const [rows, setRows] = useState(initial.map((p) => ({ ...p })))
  const setVal = (i: number, v: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, value: v } : r)))
  return (
    <Modal title="Ubah parameter estimasi" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((r, i) => (
          <Field key={r.label} label={r.label} value={r.value} onChange={(v) => setVal(i, v)} />
        ))}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
          <button type="button" style={btnGhost} onClick={onClose}>
            Batal
          </button>
          <button type="button" style={btnPrimary} onClick={() => onSave(rows)}>
            Simpan
          </button>
        </div>
      </div>
    </Modal>
  )
}

function AiVeModal({
  projectId,
  context,
  onClose,
}: {
  projectId: string
  context: string[]
  onClose: () => void
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [suggestions, setSuggestions] = useState<VeSuggestion[]>([])
  const [msg, setMsg] = useState('')

  const run = async () => {
    setState('loading')
    const r = await requestVeSuggestions(projectId, context)
    if (r.ok) {
      setSuggestions(r.suggestions ?? [])
      setState('done')
    } else {
      setMsg(r.error ?? 'Gagal')
      setState('error')
    }
  }

  return (
    <Modal title="✦ Minta usulan VE dari AI" onClose={onClose} width={520}>
      <div style={{ font: sans('400 12px/1.6'), color: color.muted, marginBottom: 14 }}>
        AI menelaah item pekerjaan pada estimasi ini dan mengusulkan alternatif value engineering
        beserta perkiraan penghematannya. Hasil bersifat usulan — tetap perlu diverifikasi.
      </div>

      {state === 'idle' && (
        <button type="button" style={{ ...btnPrimary, width: '100%', padding: 10 }} onClick={run}>
          Jalankan analisa
        </button>
      )}

      {state === 'loading' && (
        <div style={{ font: mono('400 12px'), color: color.faint, padding: '8px 0' }}>
          Menganalisa item pekerjaan…
        </div>
      )}

      {state === 'error' && (
        <div
          style={{
            background: color.amberPanelBg,
            color: color.amberPanelText,
            borderRadius: 8,
            padding: '12px 13px',
            font: sans('400 12px/1.6'),
          }}
        >
          {msg}
        </div>
      )}

      {state === 'done' &&
        (suggestions.length === 0 ? (
          <div style={{ font: sans('400 12px'), color: color.muted }}>
            AI tidak menemukan usulan tambahan.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suggestions.map((s, i) => (
              <div
                key={i}
                style={{
                  border: `1px solid ${color.border}`,
                  borderRadius: 8,
                  padding: '11px 13px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ font: sans('600 12.5px') }}>{s.item}</span>
                  <span style={{ font: mono('600 12px'), color: color.greenOk }}>{s.saving}</span>
                </div>
                <div style={{ font: sans('400 11.5px/1.6'), color: color.inkSoft, marginTop: 4 }}>
                  {s.change}
                </div>
                {s.note && (
                  <div style={{ font: sans('400 11px/1.55'), color: color.muted, marginTop: 4 }}>
                    {s.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
    </Modal>
  )
}
