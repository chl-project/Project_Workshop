import { useState } from 'react'
import { fetchKomposit, keys } from '@/api'
import { htmlTable, printReport } from '@/lib/export'
import { floors, lockTooltip } from '@/data/komposit'
import { Chip, ErrorPanel, LoadingPanel, NoDataPanel, Segmented } from '@/components/primitives'
import { useResource } from '@/hooks/useResource'
import { useViewport } from '@/hooks/useViewport'
import { autoGrid, btnGhost, card, cardClipped, chip, screenSub, screenTitle, scrollX, splitGrid, table, th, theadRow } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { ChipTone } from '@/theme/styles'
import type { ClashLevel, CompositeData, ScreenId } from '@/types'

type LayerKey = 'ars' | 'str' | 'mep' | 'int'
type Floor = (typeof floors)[number]

const layerMeta: { key: LayerKey; label: string; color: string }[] = [
  { key: 'ars', label: 'Arsitektur', color: color.layerArs },
  { key: 'str', label: 'Struktur', color: color.layerStr },
  { key: 'mep', label: 'MEP', color: color.layerMep },
  { key: 'int', label: 'Interior', color: color.layerInt },
]

const levelTone: Record<ClashLevel, ChipTone> = {
  Kritis: 'red',
  Mayor: 'amber',
  Minor: 'neutral',
}

const checkGlyph = {
  fail: { glyph: '✕', color: color.red },
  warn: { glyph: '!', color: color.amber },
  ok: { glyph: '✓', color: color.greenOk },
} as const

export function GambarKomposit({
  projectId,
  onOpenClash,
  onNavigate,
}: {
  projectId: string
  onOpenClash: (no: string) => void
  onNavigate: (s: ScreenId) => void
}) {
  const { isCompact } = useViewport()
  const { data, loading, error } = useResource<CompositeData>(keys.komposit(projectId), () =>
    fetchKomposit(projectId),
  )
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    ars: true,
    str: true,
    mep: true,
    int: true,
  })
  const [opacity, setOpacity] = useState(70)
  const [floor, setFloor] = useState<Floor>('Lt.2')
  const [zoom, setZoom] = useState(100)

  if (loading) return <LoadingPanel />
  if (error) return <ErrorPanel error={error} />
  if (!data) return <NoDataPanel screen="gambar komposit" onNavigate={() => onNavigate('spek')} />

  const toggle = (k: LayerKey) => setLayers((prev) => ({ ...prev, [k]: !prev[k] }))
  const op = (k: LayerKey) => (layers[k] ? 1 : 0)

  const clampZoom = (z: number) => Math.min(250, Math.max(50, z))

  const exportKoordinasi = () => {
    const body =
      `<h1>Laporan Koordinasi — Gambar Komposit</h1>` +
      `<div class="meta">${floor} · ${data.clashTotal} temuan · progres koordinasi ${data.coordination.donePct}%</div>` +
      `<h2>Ringkasan</h2>` +
      htmlTable(
        ['Keterangan', 'Nilai'],
        data.coordination.counts.map((c) => [c.label, String(c.value)]),
      ) +
      `<h2>Temuan clash &amp; inkonsistensi</h2>` +
      htmlTable(
        ['No', 'Lokasi', 'Disiplin', 'Masalah', 'Tingkat', 'PIC', 'Status'],
        data.clashes.map((c) => [c.no, c.location, c.disciplines, c.problem, c.level, c.pic, c.status]),
      ) +
      `<h2>Checklist koordinasi</h2>` +
      htmlTable(
        ['Item', 'Status'],
        data.checklist.map((c) => [c.label, c.state]),
      )
    printReport('Laporan Koordinasi', body)
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <div style={screenTitle}>Gambar Komposit</div>
          <div style={screenSub}>
            Apakah gambar arsitektur, sipil, MEP, dan interior sudah nyambung satu sama lain?
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="btn-ghost" style={btnGhost} onClick={exportKoordinasi}>
            Ekspor laporan koordinasi
          </button>
          <button
            type="button"
            title={lockTooltip}
            disabled
            style={{
              border: 0,
              borderRadius: 7,
              padding: '8px 14px',
              font: sans('500 12px'),
              background: color.segmentTrack,
              color: color.ghost,
              cursor: 'not-allowed',
            }}
          >
            🔒 Kunci sebagai gambar komposit
          </button>
        </div>
      </div>

      <div style={{ ...autoGrid(150, 12), marginBottom: 14 }}>
        {data.disciplines.map((d) => (
          <div
            key={d.name}
            style={{
              background: d.placeholder ? color.surfaceSoft : color.surface,
              border: d.placeholder
                ? `1px dashed ${color.borderDashed}`
                : `1px solid ${color.border}`,
              borderRadius: 10,
              padding: '13px 14px',
              borderLeft: d.accent ? `3px solid ${d.accent}` : undefined,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: sans('600 12px'), color: d.placeholder ? color.muted : undefined }}>
                {d.name}
              </span>
              <Chip tone={d.statusTone}>{d.status}</Chip>
            </div>
            <div style={{ font: mono('400 11px/1.6'), color: color.faint, marginTop: 6 }}>
              {d.lines.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{ ...splitGrid(300, isCompact, 14), marginBottom: 14 }}
      >
        <div style={cardClipped}>
          <div
            style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${color.borderSoft}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ font: sans('600 12.5px') }}>Viewer overlay</span>
            <span style={{ font: mono('400 11px'), color: color.faint }}>{floor} · skala 1:100</span>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              style={zoomPill}
              onClick={() => setZoom((z) => clampZoom(z - 25))}
              aria-label="Perkecil"
            >
              −
            </button>
            <button
              type="button"
              style={zoomPill}
              onClick={() => setZoom(100)}
              aria-label="Setel zoom ke 100%"
            >
              {zoom}%
            </button>
            <button
              type="button"
              style={zoomPill}
              onClick={() => setZoom((z) => clampZoom(z + 25))}
              aria-label="Perbesar"
            >
              ＋
            </button>
            <button type="button" style={zoomPill} onClick={() => setZoom(100)}>
              reset
            </button>
          </div>
          <div style={{ background: color.surfaceGrid, padding: 14, overflow: 'auto' }}>
            <svg
              viewBox="0 0 620 380"
              style={{ width: `${zoom}%`, display: 'block' }}
              role="img"
              aria-label="Placeholder gambar denah bertumpuk antar disiplin"
            >
              <defs>
                <pattern id="grid-viewer" width="31" height="31" patternUnits="userSpaceOnUse">
                  <path d="M31 0H0V31" fill="none" stroke="#EAEAE2" />
                </pattern>
              </defs>
              <rect width="620" height="380" fill="url(#grid-viewer)" />
              <g opacity={opacity / 100}>
                <g opacity={op('ars')} stroke={color.layerArs} fill="none" strokeWidth="2">
                  <rect x="62" y="50" width="496" height="280" />
                  <rect x="62" y="50" width="248" height="150" />
                  <rect x="310" y="50" width="248" height="150" />
                  <rect x="62" y="200" width="180" height="130" />
                  <line x1="242" y1="200" x2="242" y2="330" />
                  <line x1="400" y1="200" x2="400" y2="330" />
                </g>
                <g opacity={op('str')} stroke={color.layerStr} fill="none" strokeWidth="1.6">
                  {[43, 193, 323].map((y) =>
                    [55, 303, 551].map((x) => (
                      <rect key={`${x}-${y}`} x={x} y={y} width="14" height="14" />
                    )),
                  )}
                  <line x1="62" y1="200" x2="558" y2="200" strokeDasharray="8 4" />
                  <line x1="310" y1="50" x2="310" y2="330" strokeDasharray="8 4" />
                </g>
                <g opacity={op('mep')} stroke={color.layerMep} fill="none" strokeWidth="1.6">
                  <path d="M100 90 H280 V190 H360 V120 H520" />
                  <path d="M120 300 H380 V240" strokeDasharray="5 3" />
                  <circle cx="186" cy="120" r="6" />
                  <circle cx="434" cy="120" r="6" />
                  <circle cx="186" cy="265" r="6" />
                </g>
                <g opacity={op('int')} stroke={color.layerInt} fill="none" strokeWidth="1.4">
                  <rect x="86" y="230" width="120" height="46" rx="3" />
                  <rect x="330" y="76" width="90" height="52" rx="3" />
                </g>
              </g>
              <g fontFamily="IBM Plex Mono" fontSize="10">
                <circle cx="310" cy="200" r="11" fill={color.red} />
                <text x="310" y="204" textAnchor="middle" fill="#FFFFFF">
                  1
                </text>
                <circle cx="360" cy="120" r="11" fill={color.red} />
                <text x="360" y="124" textAnchor="middle" fill="#FFFFFF">
                  2
                </text>
                <circle cx="242" cy="265" r="11" fill={color.amber} />
                <text x="242" y="269" textAnchor="middle" fill="#FFFFFF">
                  3
                </text>
                <circle cx="500" cy="300" r="11" fill={color.grey} />
                <text x="500" y="304" textAnchor="middle" fill="#FFFFFF">
                  4
                </text>
              </g>
              <text x="62" y="360" fontFamily="IBM Plex Mono" fontSize="10" fill="#A0A398">
                placeholder denah — gambar asli dimuat dari PDF/DWG yang diupload
              </text>
            </svg>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...card, padding: '15px 16px' }}>
            <div style={{ font: sans('600 12.5px'), marginBottom: 12 }}>Layer</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, font: sans('400 12px') }}>
              {layerMeta.map((l) => (
                <label key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                  <input type="checkbox" checked={layers[l.key]} onChange={() => toggle(l.key)} />
                  <span style={{ width: 14, height: 3, background: l.color, borderRadius: 2 }} />
                  {l.label}
                </label>
              ))}
            </div>

            <div style={{ marginTop: 15 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  font: sans('500 11.5px'),
                  marginBottom: 6,
                }}
              >
                <span>Opacity</span>
                <span style={{ font: mono('600 11.5px') }}>{opacity}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                aria-label="Opacity layer"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginTop: 15 }}>
              <div style={{ font: sans('500 11.5px'), marginBottom: 7 }}>Lantai</div>
              <Segmented options={floors} value={floor} onChange={setFloor} fill padding="6px" />
            </div>
          </div>

          <div style={{ ...card, padding: '15px 16px' }}>
            <div style={{ font: sans('600 12.5px'), marginBottom: 4 }}>Ringkasan koordinasi</div>
            <div style={{ font: mono('400 11px'), color: color.faint, marginBottom: 11 }}>
              {data.coordination.doneNote}
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 5,
                background: color.segmentTrack,
                overflow: 'hidden',
                marginBottom: 13,
              }}
            >
              <div
                style={{
                  width: `${data.coordination.donePct}%`,
                  height: '100%',
                  background: color.green,
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, font: sans('400 11.5px') }}>
              {data.coordination.counts.map((c) => (
                <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: c.color }}>{c.label}</span>
                  <span style={{ font: mono('600 11.5px') }}>{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={splitGrid(300, isCompact, 14)}>
        <div style={cardClipped}>
          <div
            style={{
              padding: '12px 15px',
              borderBottom: `1px solid ${color.borderSoft}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ font: sans('600 12.5px') }}>Temuan clash &amp; inkonsistensi</div>
            <span style={{ font: mono('400 11px'), color: color.faint }}>
              {data.clashTotal} temuan · klik untuk zoom ke titik
            </span>
          </div>
          <div style={scrollX}>
            <table style={table}>
              <thead>
                <tr style={theadRow}>
                  <th style={th({ padding: '9px 15px' })}>NO</th>
                  <th style={th()}>LOKASI</th>
                  <th style={th()}>DISIPLIN</th>
                  <th style={th()}>MASALAH</th>
                  <th style={th()}>TINGKAT</th>
                  <th style={th()}>PIC</th>
                  <th style={th({ padding: '9px 15px' })}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {data.clashes.map((row, i) => (
                  <tr
                    key={row.no}
                    className="row-hover"
                    onClick={() => onOpenClash(row.no)}
                    style={{
                      borderBottom:
                        i === data.clashes.length - 1 ? undefined : `1px solid ${color.rowLine}`,
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '10px 15px', font: mono('500 12px') }}>{row.no}</td>
                    <td style={{ padding: '10px 8px', font: mono('400 11.5px') }}>{row.location}</td>
                    <td style={{ padding: '10px 8px', color: color.muted }}>{row.disciplines}</td>
                    <td style={{ padding: '10px 8px' }}>{row.problem}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={chip(levelTone[row.level])}>{row.level}</span>
                    </td>
                    <td style={{ padding: '10px 8px', color: color.muted }}>{row.pic}</td>
                    <td style={{ padding: '10px 15px' }}>
                      <span style={{ font: mono('500 10.5px'), color: row.statusColor }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...card, padding: '15px 16px' }}>
          <div style={{ font: sans('600 12.5px'), marginBottom: 11 }}>Checklist koordinasi</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, font: sans('400 11.5px/1.4') }}>
            {data.checklist.map((c) => (
              <div key={c.label} style={{ display: 'flex', gap: 9 }}>
                <span style={{ color: checkGlyph[c.state].color, font: mono('500 11px') }}>
                  {checkGlyph[c.state].glyph}
                </span>
                {c.label}
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 13,
              padding: '10px 11px',
              borderRadius: 7,
              background: color.redPanelBg,
              font: sans('400 11.5px/1.55'),
              color: color.redPanelText,
            }}
          >
            {data.lockBlockedNote}
          </div>
        </div>
      </div>
    </>
  )
}

const zoomPill = {
  font: mono('400 11px'),
  color: color.muted,
  border: `1px solid ${color.border}`,
  borderRadius: 5,
  padding: '4px 9px',
  background: color.surface,
  cursor: 'pointer',
} as const
