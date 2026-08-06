import { useState } from 'react'
import { fetchClashDetail, keys } from '@/api'
import { Chip, ErrorPanel, LoadingPanel } from '@/components/primitives'
import { useResource } from '@/hooks/useResource'
import { btnGhost, btnPrimary } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { ClashDetail } from '@/types'
import { Drawer, DrawerBody, FactRow } from './Drawer'

export function ClashDrawer({ no, onClose }: { no: string; onClose: () => void }) {
  const { data, loading, error } = useResource<ClashDetail>(keys.clashDetail(no), () =>
    fetchClashDetail(no),
  )
  const [marked, setMarked] = useState<'none' | 'reviewed' | 'done'>('none')

  return (
    <Drawer
      kicker={data?.kicker ?? `TEMUAN ${no}`}
      title={data?.title ?? 'Memuat…'}
      onClose={onClose}
    >
      {loading && (
        <div style={{ padding: '18px 20px' }}>
          <LoadingPanel label="Memuat temuan…" />
        </div>
      )}
      {error && (
        <div style={{ padding: '18px 20px' }}>
          <ErrorPanel error={error} />
        </div>
      )}
      {data && (
        <DrawerBody>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Chip tone="red">{data.level}</Chip>
            <span style={{ font: mono('400 11.5px'), color: color.muted }}>{data.location}</span>
          </div>

          <div style={{ border: `1px solid ${color.border}`, borderRadius: 9, overflow: 'hidden' }}>
            <svg
              viewBox="0 0 380 200"
              style={{ width: '100%', display: 'block', background: color.surfaceGrid }}
              role="img"
              aria-label="Potongan area clash"
            >
              <defs>
                <pattern id="grid-clash" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M20 0H0V20" fill="none" stroke="#EAEAE2" />
                </pattern>
              </defs>
              <rect width="380" height="200" fill="url(#grid-clash)" />
              <rect
                x="40"
                y="60"
                width="300"
                height="14"
                fill="rgba(63,107,168,.18)"
                stroke="#3F6BA8"
                strokeWidth="1.6"
              />
              <rect x="150" y="52" width="90" height="70" fill="none" stroke="#9A9A8C" strokeWidth="2" />
              <rect
                x="150"
                y="60"
                width="90"
                height="14"
                fill="rgba(181,67,47,.25)"
                stroke="#B5432F"
                strokeWidth="1.6"
              />
              <text x="248" y="58" fontFamily="IBM Plex Mono" fontSize="10" fill="#3F6BA8">
                balok B2 h=60
              </text>
              <text x="150" y="138" fontFamily="IBM Plex Mono" fontSize="10" fill="#6E7268">
                kusen J-3 (t. atas +2,10)
              </text>
              <text x="40" y="186" fontFamily="IBM Plex Mono" fontSize="10" fill="#A0A398">
                {data.drawingCaption}
              </text>
            </svg>
          </div>

          <div style={{ font: sans('400 12px/1.65') }}>
            <span style={{ color: color.muted }}>Masalah</span>
            <br />
            {data.problem}
          </div>

          <div
            style={{
              background: color.greenTint,
              borderRadius: 8,
              padding: '12px 13px',
              font: sans('400 11.5px/1.6'),
              color: '#4B5540',
            }}
          >
            <span style={{ fontWeight: 600 }}>Rekomendasi</span>
            <br />
            {data.recommendation}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              borderTop: `1px solid ${color.borderSoft}`,
              paddingTop: 14,
            }}
          >
            {data.facts.map((f) => (
              <FactRow key={f.label} label={f.label}>
                <span style={{ fontWeight: 500, color: f.valueColor }}>{f.value}</span>
              </FactRow>
            ))}
          </div>

          {marked === 'none' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                style={{ ...btnGhost, flex: 1, padding: 9 }}
                onClick={() => setMarked('reviewed')}
              >
                Tandai ditinjau
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ ...btnPrimary, flex: 1, padding: 9 }}
                onClick={() => setMarked('done')}
              >
                Tandai selesai
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                background: color.greenTint,
                border: `1px solid ${color.greenLine}`,
                borderRadius: 8,
                padding: '10px 13px',
                font: sans('500 12px'),
                color: color.greenText,
              }}
            >
              <span>✓ {marked === 'done' ? 'Ditandai selesai' : 'Ditandai untuk ditinjau'}</span>
              <button
                type="button"
                onClick={() => setMarked('none')}
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  font: mono('400 11px'),
                  color: color.muted,
                }}
              >
                Urungkan
              </button>
            </div>
          )}
        </DrawerBody>
      )}
    </Drawer>
  )
}
