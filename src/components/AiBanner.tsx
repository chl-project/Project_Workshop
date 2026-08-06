import { color, mono, sans } from '@/theme/tokens'

/** "Angka ini hasil bantuan AI…" — shown above Build Up Cost and BQ / RAB. */
export function AiBanner({ text, marginBottom }: { text: string; marginBottom: number }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        background: color.amberBannerBg,
        border: `1px solid ${color.amberBannerBorder}`,
        borderRadius: 9,
        padding: '11px 14px',
        marginBottom,
      }}
    >
      <span style={{ font: mono('500 12px'), color: color.amberText }}>⚠</span>
      <div style={{ font: sans('400 12px/1.55'), color: color.amberPanelText }}>{text}</div>
    </div>
  )
}
