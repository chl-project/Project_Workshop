import { useEffect } from 'react'
import { color, layout, mono, sans } from '@/theme/tokens'
import { currentUser, today } from '@/data/projects'
import type { Project } from '@/types'

export function Header({
  title,
  projects,
  activeProjectId,
  onSelectProject,
  open,
  onToggle,
  onClose,
}: {
  title: string
  projects: Project[]
  activeProjectId: string
  onSelectProject: (id: string) => void
  open: boolean
  onToggle: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const active = projects.find((p) => p.id === activeProjectId) ?? projects[0]

  return (
    <header
      style={{
        height: layout.headerHeight,
        flex: 'none',
        background: color.surface,
        borderBottom: `1px solid ${color.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 24px',
      }}
    >
      <button
        type="button"
        className="proj-btn"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          height: 34,
          padding: '0 12px',
          border: `1px solid ${color.border}`,
          borderRadius: 7,
          background: color.surfaceSoft,
          cursor: 'pointer',
          font: sans('500 12.5px'),
          color: color.ink,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6E8B3D' }} />
        {active?.name}
        <span style={{ color: color.faint, fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <>
          <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
          <div
            style={{
              position: 'fixed',
              top: 52,
              left: 260,
              zIndex: 40,
              width: 300,
              background: color.surface,
              border: `1px solid ${color.border}`,
              borderRadius: 9,
              boxShadow: '0 10px 30px rgba(0,0,0,.12)',
              padding: 8,
            }}
          >
            <div
              style={{
                padding: '7px 9px',
                borderBottom: `1px solid ${color.borderSoft}`,
                font: mono('400 11.5px'),
                color: color.faint,
              }}
            >
              Cari proyek…
            </div>
            {projects.map((p) => {
              const isActive = p.id === activeProjectId
              return (
                <div
                  key={p.id}
                  className={isActive ? undefined : 'proj-option'}
                  onClick={() => onSelectProject(p.id)}
                  style={{
                    padding: 9,
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: isActive ? color.greenTint : undefined,
                    font: sans('500 12.5px'),
                  }}
                >
                  {p.name}
                  <div style={{ font: mono('400 11px'), color: color.faint, marginTop: 2 }}>
                    {p.meta}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div style={{ width: 1, height: 22, background: color.border }} />
      <div style={{ font: sans('600 14px'), letterSpacing: '-.01em' }}>{title}</div>
      <div style={{ flex: 1 }} />
      <div style={{ font: mono('400 11.5px'), color: color.faint }}>{today}</div>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: color.avatarBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: mono('600 11px'),
          color: color.greenDeep,
        }}
      >
        {currentUser.initials}
      </div>
    </header>
  )
}
