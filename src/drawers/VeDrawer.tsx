import { fetchVeDetail, keys } from '@/api'
import { Chip, ErrorPanel, LoadingPanel } from '@/components/primitives'
import { useResource } from '@/hooks/useResource'
import { btnGhost, btnPrimary } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { ScreenId, VeDetail } from '@/types'
import { Drawer, DrawerBody, FactRow } from './Drawer'

export function VeDrawer({
  veId,
  onClose,
  onNavigate,
}: {
  veId: string
  onClose: () => void
  onNavigate: (s: ScreenId) => void
}) {
  const { data, loading, error } = useResource<VeDetail>(keys.veDetail(veId), () =>
    fetchVeDetail(veId),
  )

  return (
    <Drawer
      kicker={data?.kicker ?? 'USULAN VALUE ENGINEERING'}
      title={data?.title ?? 'Memuat…'}
      onClose={onClose}
    >
      {loading && (
        <div style={{ padding: '18px 20px' }}>
          <LoadingPanel label="Memuat usulan…" />
        </div>
      )}
      {error && (
        <div style={{ padding: '18px 20px' }}>
          <ErrorPanel error={error} />
        </div>
      )}
      {data && (
        <DrawerBody>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              background: color.greenTint,
              borderRadius: 9,
              padding: '13px 15px',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ font: mono('400 10.5px'), color: color.green }}>PENGHEMATAN</div>
              <div style={{ font: mono('600 20px'), color: color.greenText, marginTop: 3 }}>
                {data.saving}
              </div>
            </div>
            <div
              style={{
                font: mono('400 11.5px/1.6'),
                color: color.muted,
                textAlign: 'right',
                whiteSpace: 'pre-line',
              }}
            >
              {data.savingNote}
            </div>
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 9, font: sans('400 12px/1.6') }}
          >
            <div>
              <span style={{ color: color.muted }}>Kondisi awal</span>
              <br />
              {data.before}
            </div>
            <div>
              <span style={{ color: color.muted }}>Usulan</span>
              <br />
              {data.after}
            </div>
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
                {f.chip ? (
                  <Chip tone={f.chip}>{f.value}</Chip>
                ) : (
                  <span style={{ fontWeight: 500, color: f.valueColor }}>{f.value}</span>
                )}
              </FactRow>
            ))}
          </div>

          <div
            style={{
              background: color.amberPanelBg,
              borderRadius: 8,
              padding: '11px 13px',
              font: sans('400 11.5px/1.6'),
              color: color.amberPanelText,
            }}
          >
            {data.risk}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={{ ...btnGhost, flex: 1, padding: 9 }}>
              Tunda
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onNavigate('bmw')
                onClose()
              }}
              style={{ ...btnPrimary, flex: 1, padding: 9 }}
            >
              Lihat skenario
            </button>
          </div>
        </DrawerBody>
      )}
    </Drawer>
  )
}
