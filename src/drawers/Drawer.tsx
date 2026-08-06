import { useEffect, type ReactNode } from 'react'
import { color, layout, mono, sans } from '@/theme/tokens'

export type DrawerRequest =
  | { kind: 'volume'; itemNo: string }
  | { kind: 've'; id: string }
  | { kind: 'clash'; no: string }
  | null

export function Drawer({
  kicker,
  title,
  onClose,
  children,
}: {
  kicker: string
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(27,29,24,.28)', zIndex: 50 }}
      />
      <aside
        role="dialog"
        aria-label={title}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: layout.drawerWidth,
          background: color.surface,
          borderLeft: `1px solid ${color.border}`,
          boxShadow: '-14px 0 40px rgba(0,0,0,.10)',
          zIndex: 51,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${color.borderSoft}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            position: 'sticky',
            top: 0,
            background: color.surface,
            zIndex: 1,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ font: mono('400 10.5px'), letterSpacing: '.06em', color: color.faint }}>
              {kicker}
            </div>
            <div style={{ font: sans('600 15px/1.35'), marginTop: 5 }}>{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            style={{
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              font: mono('400 16px'),
              color: color.faint,
              padding: '2px 4px',
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </aside>
    </>
  )
}

/** Shared body wrapper — 18/20 padding, stacked sections. */
export function DrawerBody({ gap = 16, children }: { gap?: number; children: ReactNode }) {
  return (
    <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap }}>
      {children}
    </div>
  )
}

/** label / value line used by every drawer's fact list. */
export function FactRow({
  label,
  children,
  borderTop,
}: {
  label: string
  children: ReactNode
  borderTop?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        font: sans('400 12px'),
        borderTop: borderTop ? `1px solid ${color.borderSoft}` : undefined,
        paddingTop: borderTop ? 10 : undefined,
      }}
    >
      <span style={{ color: color.muted }}>{label}</span>
      {children}
    </div>
  )
}
