import { useState } from 'react'
import { fetchBmw, keys } from '@/api'
import { htmlTable, printReport } from '@/lib/export'
import { ErrorPanel, LoadingPanel } from '@/components/primitives'
import { useResource } from '@/hooks/useResource'
import {
  formatScore,
  radarPoints,
  rebalance,
  recommend,
  score,
  type WeightKey,
  type Weights,
} from '@/lib/scenario'
import { btnGhost, btnPrimary, card, cardClipped, screenSub, screenTitle, table } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { BmwData, Scenario, ScenarioKey } from '@/types'

const radarStroke: Record<ScenarioKey, string> = {
  basic: color.grey,
  std: color.green,
  prem: color.greenSage,
}

const radarFill: Record<ScenarioKey, string> = {
  basic: 'rgba(154,154,140,.16)',
  std: 'rgba(95,111,60,.18)',
  prem: 'rgba(169,184,114,.16)',
}

const sliderLabels: { key: WeightKey; label: string }[] = [
  { key: 'b', label: 'Biaya' },
  { key: 'm', label: 'Mutu' },
  { key: 't', label: 'Waktu' },
]

export function BiayaMutuWaktu({ projectId }: { projectId: string }) {
  const { data, loading, error } = useResource<{ data: BmwData; defaultWeights: Weights }>(
    keys.bmw(projectId),
    () => fetchBmw(projectId),
  )
  const [weights, setWeights] = useState<Weights | null>(null)
  const [extra, setExtra] = useState<Scenario[]>([])

  if (loading) return <LoadingPanel />
  if (error) return <ErrorPanel error={error} />
  if (!data) return null

  const w = weights ?? data.defaultWeights
  const scenarios = [...data.data.scenarios, ...extra]
  const recommendation = recommend(scenarios, w)

  const setWeight = (key: WeightKey, value: number) => setWeights(rebalance(w, key, value))

  const cellBg = (s: Scenario) => (s.isBase ? color.greenRow : undefined)

  const addScenario = () => {
    const base = data.data.scenarios.find((s) => s.isBase) ?? data.data.scenarios[0]
    const n = extra.length + 1
    setExtra((prev) => [
      ...prev,
      {
        ...base,
        key: `custom${n}` as ScenarioKey,
        name: `Skenario ${n}`,
        subtitle: 'skenario kustom',
        isBase: false,
      },
    ])
  }

  const exportPdf = () => {
    const headers = ['Aspek', ...scenarios.map((s) => s.name)]
    const rows = [
      ['Biaya', ...scenarios.map((s) => s.cost.total)],
      ['Mutu', ...scenarios.map((s) => s.quality.join('; '))],
      ['Waktu', ...scenarios.map((s) => s.time.weeks)],
      ['Risiko', ...scenarios.map((s) => s.risk)],
      ['Skor', ...scenarios.map((s) => formatScore(score(s, w)))],
    ]
    printReport(
      'Perbandingan Skenario',
      `<h1>Biaya–Mutu–Waktu — Perbandingan Skenario</h1>` +
        `<div class="meta">Bobot: Biaya ${w.b}% · Mutu ${w.m}% · Waktu ${w.t}%</div>` +
        htmlTable(headers, rows) +
        `<h2>Rekomendasi: ${recommendation.name}</h2><p>${recommendation.why}</p>` +
        `<p><strong>Perlu diwaspadai:</strong> ${recommendation.watch}</p>`,
    )
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
        <div style={{ maxWidth: 560 }}>
          <div style={screenTitle}>Biaya–Mutu–Waktu</div>
          <div style={screenSub}>
            Kalau biayanya ditekan, apa yang dikorbankan? Skenario mana yang paling masuk akal?
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-ghost" style={btnGhost} onClick={addScenario}>
            ＋ Skenario baru
          </button>
          <button type="button" className="btn-primary" style={btnPrimary} onClick={exportPdf}>
            Ekspor PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        <div style={cardClipped}>
          <table style={table}>
            <thead>
              <tr style={{ background: color.surfaceMuted }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    font: mono('500 10.5px'),
                    letterSpacing: '.05em',
                    color: color.muted,
                    borderBottom: `1px solid ${color.borderSoft}`,
                    width: 150,
                  }}
                >
                  ASPEK
                </th>
                {scenarios.map((s) => (
                  <th
                    key={s.key}
                    style={{
                      textAlign: 'left',
                      padding: '12px 12px',
                      borderBottom: `1px solid ${color.borderSoft}`,
                      background: cellBg(s),
                    }}
                  >
                    <div style={{ font: sans('600 13px') }}>
                      {s.name}
                      {s.isBase && (
                        <span style={{ font: mono('400 10px'), color: color.green }}> DASAR</span>
                      )}
                    </div>
                    <div style={{ font: mono('400 10.5px'), color: color.faint, marginTop: 2 }}>
                      {s.subtitle}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${color.rowLine}` }}>
                <td style={aspectCell}>BIAYA</td>
                {scenarios.map((s) => (
                  <td key={s.key} style={{ padding: 12, verticalAlign: 'top', background: cellBg(s) }}>
                    <div style={{ font: mono('600 15px') }}>{s.cost.total}</div>
                    <div style={{ font: mono('400 11.5px/1.7'), color: color.muted, marginTop: 4 }}>
                      {s.cost.perM2}
                      <br />
                      <span style={{ color: s.cost.deltaColor }}>{s.cost.delta}</span>
                    </div>
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: `1px solid ${color.rowLine}` }}>
                <td style={aspectCell}>MUTU</td>
                {scenarios.map((s) => (
                  <td
                    key={s.key}
                    style={{
                      padding: 12,
                      verticalAlign: 'top',
                      background: cellBg(s),
                      font: sans('400 11.5px/1.7'),
                    }}
                  >
                    {s.quality.map((line, i) => (
                      <span key={line} style={{ color: i === s.quality.length - 1 ? s.qualityFlagColor : undefined }}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: `1px solid ${color.rowLine}` }}>
                <td style={aspectCell}>WAKTU</td>
                {scenarios.map((s) => (
                  <td
                    key={s.key}
                    style={{
                      padding: 12,
                      verticalAlign: 'top',
                      background: cellBg(s),
                      font: sans('400 11.5px/1.7'),
                    }}
                  >
                    <span style={{ font: mono('600 13px') }}>{s.time.weeks}</span>
                    <br />
                    {s.time.lines.map((line) => (
                      <span key={line}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={aspectCell}>RISIKO</td>
                {scenarios.map((s) => (
                  <td
                    key={s.key}
                    style={{
                      padding: 12,
                      verticalAlign: 'top',
                      background: cellBg(s),
                      font: sans('400 11.5px/1.7'),
                      color: color.muted,
                    }}
                  >
                    {s.risk}
                  </td>
                ))}
              </tr>
              <tr style={{ background: color.surfaceMuted, borderTop: `1px solid ${color.border}` }}>
                <td
                  style={{
                    padding: '13px 16px',
                    font: mono('600 11px'),
                    color: color.muted,
                  }}
                >
                  SKOR
                </td>
                {scenarios.map((s) => (
                  <td key={s.key} style={{ padding: '13px 12px', background: cellBg(s) }}>
                    <div style={{ font: mono('600 19px') }}>{formatScore(score(s, w))}</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...card, padding: '16px 17px' }}>
            <div style={{ font: sans('600 12.5px'), marginBottom: 3 }}>Pembobotan</div>
            <div style={{ font: mono('400 11px'), color: color.faint, marginBottom: 14 }}>
              total selalu 100% · skor ikut berubah
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sliderLabels.map(({ key, label }) => (
                <div key={key}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      font: sans('500 11.5px'),
                      marginBottom: 6,
                    }}
                  >
                    <span>{label}</span>
                    <span style={{ font: mono('600 11.5px') }}>{w[key]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={w[key]}
                    onChange={(e) => setWeight(key, Number(e.target.value))}
                    aria-label={`Bobot ${label}`}
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
            </div>

            <svg
              viewBox="0 0 200 180"
              style={{ width: '100%', marginTop: 14 }}
              role="img"
              aria-label="Grafik radar tiga sumbu"
            >
              <polygon points="100,20 178,155 22,155" fill="none" stroke={color.border} />
              <polygon points="100,65 152,155 48,155" fill="none" stroke={color.borderSoft} />
              <line x1="100" y1="110" x2="100" y2="20" stroke={color.border} />
              <line x1="100" y1="110" x2="178" y2="155" stroke={color.border} />
              <line x1="100" y1="110" x2="22" y2="155" stroke={color.border} />
              {scenarios.map((s) => (
                <polygon
                  key={s.key}
                  points={radarPoints(s)}
                  fill={radarFill[s.key] ?? 'rgba(120,120,110,.15)'}
                  stroke={radarStroke[s.key] ?? color.greenSage}
                  strokeWidth={s.isBase ? 1.8 : 1.6}
                />
              ))}
              <text x="100" y="13" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9" fill="#6E7268">
                MUTU
              </text>
              <text x="180" y="168" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9" fill="#6E7268">
                WAKTU
              </text>
              <text x="20" y="168" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="9" fill="#6E7268">
                BIAYA
              </text>
            </svg>

            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                font: mono('400 10.5px'),
                color: color.muted,
                marginTop: 6,
              }}
            >
              {scenarios.map((s) => (
                <span key={s.key}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      background: radarStroke[s.key] ?? color.greenSage,
                      borderRadius: 2,
                    }}
                  />{' '}
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              background: color.greenTint,
              border: `1px solid ${color.greenLine}`,
              borderRadius: 10,
              padding: '16px 17px',
            }}
          >
            <div style={{ font: mono('500 10.5px'), letterSpacing: '.06em', color: color.green }}>
              REKOMENDASI
            </div>
            <div style={{ font: sans('600 17px'), margin: '7px 0 8px' }}>{recommendation.name}</div>
            <div style={{ font: sans('400 12px/1.6'), color: '#4B5540' }}>{recommendation.why}</div>
            <div
              style={{
                font: sans('400 11.5px/1.6'),
                color: color.amberPanelText,
                background: color.amberPanelBg,
                borderRadius: 7,
                padding: '9px 11px',
                marginTop: 11,
              }}
            >
              Perlu diwaspadai: {recommendation.watch}
            </div>
          </div>

          <div style={{ ...card, padding: '16px 17px' }}>
            <div style={{ font: sans('600 12.5px'), marginBottom: 3 }}>
              {data.data.sensitivity.title}
            </div>
            <div style={{ font: mono('400 11px'), color: color.faint, marginBottom: 12 }}>
              {data.data.sensitivity.subtitle}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, font: sans('400 11.5px') }}>
              {data.data.sensitivity.rows.map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>{row.label}</span>
                  <span style={{ font: mono('600 11.5px'), color: color.red }}>{row.impact}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const aspectCell = {
  padding: '12px 16px',
  font: mono('500 11px'),
  color: color.muted,
  verticalAlign: 'top',
} as const
