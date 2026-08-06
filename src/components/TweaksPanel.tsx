import { useState } from 'react'
import { useSettings } from '@/state/settings'
import { Segmented } from './primitives'
import { color, mono, sans } from '@/theme/tokens'

/**
 * The prototype exposed two switches through the design tool's Tweaks panel.
 * They survive here as an in-app display panel so both variants stay demoable.
 */
export function TweaksPanel() {
  const [open, setOpen] = useState(false)
  const { sidebarTheme, setSidebarTheme, showAiBanner, setShowAiBanner } = useSettings()

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 60 }}>
      {open && (
        <div
          style={{
            width: 244,
            background: color.surface,
            border: `1px solid ${color.border}`,
            borderRadius: 10,
            boxShadow: '0 12px 32px rgba(0,0,0,.14)',
            padding: '14px 15px',
            marginBottom: 8,
          }}
        >
          <div style={{ font: mono('500 10.5px'), letterSpacing: '.06em', color: color.faint }}>
            TAMPILAN
          </div>

          <div style={{ marginTop: 12, font: sans('500 11.5px'), marginBottom: 7 }}>Tema sidebar</div>
          <Segmented
            options={['gelap', 'terang'] as const}
            value={sidebarTheme}
            onChange={setSidebarTheme}
            fill
            padding="6px"
          />

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              marginTop: 14,
              font: sans('400 12px'),
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={showAiBanner}
              onChange={(e) => setShowAiBanner(e.target.checked)}
            />
            Banner verifikasi AI
          </label>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          border: `1px solid ${color.border}`,
          background: color.surface,
          borderRadius: 8,
          padding: '8px 13px',
          cursor: 'pointer',
          font: sans('500 12px'),
          color: color.muted,
          boxShadow: '0 4px 14px rgba(0,0,0,.08)',
          marginLeft: 'auto',
          display: 'block',
        }}
      >
        {open ? '✕ Tutup' : '⚙ Tampilan'}
      </button>
    </div>
  )
}
