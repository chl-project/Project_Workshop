import { useEffect, type ReactNode } from 'react'
import { color, mono, sans } from '@/theme/tokens'
import { card } from '@/theme/styles'

/** Labeled text input for modal forms. */
export function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ font: sans('500 11.5px'), color: color.muted, marginBottom: 5 }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          font: mono('400 12px'),
          color: color.ink,
          border: `1px solid ${color.border}`,
          borderRadius: 6,
          padding: '8px 10px',
          background: color.surface,
          outline: 'none',
        }}
      />
    </label>
  )
}

/** Centered modal dialog with an overlay. Closes on Esc or overlay click. */
export function Modal({
  title,
  onClose,
  children,
  width = 440,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  width?: number
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
        style={{ position: 'fixed', inset: 0, background: 'rgba(20,22,18,.35)', zIndex: 60 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 61,
          width,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100dvh - 64px)',
          overflowY: 'auto',
          ...card,
          boxShadow: '0 20px 60px rgba(0,0,0,.22)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: `1px solid ${color.borderSoft}`,
          }}
        >
          <div style={{ font: sans('600 13.5px') }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            style={{
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              font: sans('500 15px'),
              color: color.muted,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '16px 18px' }}>{children}</div>
      </div>
    </>
  )
}
