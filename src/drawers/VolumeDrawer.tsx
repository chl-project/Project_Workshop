import { useState } from 'react'
import { fetchVolumeTrace, keys } from '@/api'
import { LoadingPanel, ErrorPanel } from '@/components/primitives'
import { useResource } from '@/hooks/useResource'
import { btnGhost, btnPrimary, btnTint } from '@/theme/styles'
import { color, mono } from '@/theme/tokens'
import type { ScreenId, VolumeTrace } from '@/types'
import { Drawer, DrawerBody, FactRow } from './Drawer'

export function VolumeDrawer({
  itemNo,
  onClose,
  onNavigate,
}: {
  itemNo: string
  onClose: () => void
  onNavigate: (s: ScreenId) => void
}) {
  const { data, loading, error } = useResource<VolumeTrace>(keys.volumeTrace(itemNo), () =>
    fetchVolumeTrace(itemNo),
  )
  const [verified, setVerified] = useState(false)
  const [editing, setEditing] = useState(false)
  const [volume, setVolume] = useState<string | null>(null)

  return (
    <Drawer
      kicker={data?.kicker ?? `PENELUSURAN VOLUME · ITEM ${itemNo}`}
      title={data?.title ?? 'Memuat…'}
      onClose={onClose}
    >
      {loading && (
        <div style={{ padding: '18px 20px' }}>
          <LoadingPanel label="Menelusuri dasar perhitungan…" />
        </div>
      )}
      {error && (
        <div style={{ padding: '18px 20px' }}>
          <ErrorPanel error={error} />
        </div>
      )}
      {data && (
        <DrawerBody gap={18}>
          <div
            style={{
              background: color.surfaceMuted,
              border: `1px solid ${color.borderSoft}`,
              borderRadius: 9,
              padding: '14px 15px',
            }}
          >
            <div style={{ font: mono('500 10.5px'), color: color.faint, marginBottom: 8 }}>
              DASAR PERHITUNGAN
            </div>
            <div style={{ font: mono('500 12.5px/1.75'), whiteSpace: 'pre-wrap' }}>
              {data.formulaLines.map((line, i) => (
                <div key={i} style={{ color: line.accent ? color.green : undefined }}>
                  {line.text}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.facts.map((f) => (
              <FactRow key={f.label} label={f.label}>
                <span style={{ font: mono('500 12px') }}>{f.value}</span>
              </FactRow>
            ))}
            <FactRow label={data.total.label} borderTop>
              {editing ? (
                <input
                  value={volume ?? data.total.value}
                  onChange={(e) => setVolume(e.target.value)}
                  aria-label="Volume manual"
                  style={{
                    font: mono('600 13px'),
                    width: 130,
                    textAlign: 'right',
                    border: `1px solid ${color.green}`,
                    borderRadius: 5,
                    padding: '3px 7px',
                    outline: 'none',
                  }}
                />
              ) : (
                <span style={{ font: mono('600 13px') }}>{volume ?? data.total.value}</span>
              )}
            </FactRow>
          </div>

          <div>
            <div style={{ font: mono('500 10.5px'), color: color.faint, marginBottom: 8 }}>
              ACUAN GAMBAR
            </div>
            <div
              style={{ border: `1px solid ${color.border}`, borderRadius: 9, overflow: 'hidden' }}
            >
              <svg
                viewBox="0 0 380 180"
                style={{ width: '100%', display: 'block', background: color.surfaceGrid }}
                role="img"
                aria-label="Potongan gambar acuan"
              >
                <defs>
                  <pattern id="grid-volume" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M20 0H0V20" fill="none" stroke="#EAEAE2" />
                  </pattern>
                </defs>
                <rect width="380" height="180" fill="url(#grid-volume)" />
                <rect x="60" y="40" width="260" height="100" fill="none" stroke="#9A9A8C" strokeWidth="2" />
                <rect x="120" y="40" width="60" height="6" fill="#FFFFFF" stroke="#9A9A8C" />
                <rect x="230" y="134" width="52" height="6" fill="#FFFFFF" stroke="#9A9A8C" />
                <rect
                  x="96"
                  y="66"
                  width="150"
                  height="50"
                  fill="rgba(138,160,74,.18)"
                  stroke="#5F6F3C"
                  strokeDasharray="4 3"
                />
                <text x="60" y="164" fontFamily="IBM Plex Mono" fontSize="10" fill="#A0A398">
                  {data.drawingCaption}
                </text>
              </svg>
            </div>
            <button
              type="button"
              className="btn-tint"
              style={{ ...btnTint, marginTop: 10, width: '100%', padding: 9 }}
              onClick={() => {
                onNavigate('gbr')
                onClose()
              }}
            >
              Lihat di gambar
            </button>
          </div>

          <div
            style={{
              borderTop: `1px solid ${color.borderSoft}`,
              paddingTop: 14,
              display: 'flex',
              gap: 8,
            }}
          >
            <button
              type="button"
              style={{ ...btnGhost, flex: 1, padding: 9 }}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? 'Simpan volume' : 'Edit volume manual'}
            </button>
            <button
              type="button"
              style={{
                ...btnPrimary,
                flex: 1,
                padding: 9,
                ...(verified ? { background: color.greenOk } : {}),
              }}
              onClick={() => setVerified(true)}
            >
              {verified ? '✓ Terverifikasi' : 'Tandai terverifikasi'}
            </button>
          </div>
        </DrawerBody>
      )}
    </Drawer>
  )
}
