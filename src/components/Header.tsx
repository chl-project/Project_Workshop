import { useEffect, useState } from 'react'
import { color, layout, mono, sans } from '@/theme/tokens'
import { useViewport } from '@/hooks/useViewport'
import { currentUser, today } from '@/data/projects'
import type { Project } from '@/types'

export type ProjectAction = 'create' | 'edit' | 'duplicate' | 'delete'

/** Small icon button inside a project row; stops the row's select handler. */
function RowAction({
  label,
  glyph,
  danger,
  onClick,
}: {
  label: string
  glyph: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      style={{
        border: 0,
        background: 'transparent',
        cursor: 'pointer',
        borderRadius: 5,
        padding: '4px 6px',
        font: sans('400 12px'),
        lineHeight: 1,
        color: danger ? color.red : color.muted,
      }}
    >
      {glyph}
    </button>
  )
}

export function Header({
  title,
  projects,
  activeProjectId,
  onSelectProject,
  onProjectAction,
  open,
  onToggle,
  onClose,
  onOpenNav,
}: {
  title: string
  projects: Project[]
  activeProjectId: string
  onSelectProject: (id: string) => void
  onProjectAction: (action: ProjectAction, project?: Project) => void
  open: boolean
  onToggle: () => void
  onClose: () => void
  /** Set when the sidebar is an overlay and needs a button to open it. */
  onOpenNav?: () => void
}) {
  const { isPhone, isNarrow } = useViewport()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const active = projects.find((p) => p.id === activeProjectId) ?? projects[0]
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = q === '' ? projects : projects.filter((p) => p.name.toLowerCase().includes(q))

  return (
    <header
      style={{
        height: layout.headerHeight,
        flex: 'none',
        background: color.surface,
        borderBottom: `1px solid ${color.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: isPhone ? 9 : 16,
        padding: isPhone ? '0 12px' : '0 24px',
      }}
    >
      {onOpenNav && (
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Buka menu"
          style={{
            flex: 'none',
            width: 34,
            height: 34,
            border: `1px solid ${color.border}`,
            borderRadius: 7,
            background: color.surfaceSoft,
            cursor: 'pointer',
            font: mono('400 15px'),
            color: color.inkSoft,
            lineHeight: 1,
          }}
        >
          ☰
        </button>
      )}

      <button
        type="button"
        className="proj-btn"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          flex: isPhone ? '1 1 auto' : 'none',
          minWidth: 0,
          maxWidth: isPhone ? undefined : 300,
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
        <span
          style={{
            flex: 'none',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#6E8B3D',
          }}
        />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {active?.name}
        </span>
        <span style={{ flex: 'none', color: color.faint, fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <>
          <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
          <div
            style={{
              position: 'fixed',
              top: 52,
              // Anchored under the sidebar on desktop; inset from both edges
              // once there is no sidebar to sit beside.
              left: isNarrow ? 12 : 260,
              right: isNarrow ? 12 : undefined,
              zIndex: 40,
              width: isNarrow ? undefined : 300,
              maxWidth: 'calc(100vw - 24px)',
              background: color.surface,
              border: `1px solid ${color.border}`,
              borderRadius: 9,
              boxShadow: '0 10px 30px rgba(0,0,0,.12)',
              padding: 8,
            }}
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari proyek…"
              aria-label="Cari proyek"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '7px 9px',
                marginBottom: 4,
                border: 'none',
                borderBottom: `1px solid ${color.borderSoft}`,
                font: mono('400 11.5px'),
                color: color.ink,
                outline: 'none',
                background: 'transparent',
              }}
            />
            {shown.length === 0 && (
              <div style={{ padding: 9, font: mono('400 11.5px'), color: color.faint }}>
                Tidak ada proyek cocok
              </div>
            )}
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {shown.map((p) => {
                const isActive = p.id === activeProjectId
                return (
                  <div
                    key={p.id}
                    className={isActive ? undefined : 'proj-option'}
                    onClick={() => onSelectProject(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 9,
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: isActive ? color.greenTint : undefined,
                      font: sans('500 12.5px'),
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {p.name}
                      <div style={{ font: mono('400 11px'), color: color.faint, marginTop: 2 }}>
                        {p.meta}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <RowAction label="Ubah" glyph="✎" onClick={() => onProjectAction('edit', p)} />
                      <RowAction
                        label="Duplikat"
                        glyph="⧉"
                        onClick={() => onProjectAction('duplicate', p)}
                      />
                      <RowAction
                        label="Hapus"
                        glyph="🗑"
                        danger
                        onClick={() => onProjectAction('delete', p)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => onProjectAction('create')}
              style={{
                width: '100%',
                marginTop: 6,
                border: `1px solid ${color.greenLine}`,
                background: color.greenTint,
                color: color.green,
                cursor: 'pointer',
                borderRadius: 7,
                padding: '9px 10px',
                font: sans('500 12px'),
                textAlign: 'left',
              }}
            >
              ＋ Proyek baru
            </button>
          </div>
        </>
      )}

      {/* On a phone the title moves into the page body — there is no room for
          it beside the project switcher, and truncating both reads as broken. */}
      {!isPhone && (
        <>
          <div style={{ width: 1, height: 22, background: color.border }} />
          <div
            style={{
              font: sans('600 14px'),
              letterSpacing: '-.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </div>
        </>
      )}
      <div style={{ flex: 1 }} />
      {!isNarrow && <div style={{ font: mono('400 11.5px'), color: color.faint }}>{today}</div>}
      <div
        style={{
          flex: 'none',
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
