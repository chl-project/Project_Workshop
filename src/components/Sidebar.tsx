import { color, font, layout, mono, sans } from '@/theme/tokens'
import { priceBasis } from '@/data/projects'
import { useSettings } from '@/state/settings'
import type { ScreenId } from '@/types'

const items: { id: ScreenId; glyph: string; label: string }[] = [
  { id: 'dash', glyph: '▤', label: 'Dashboard' },
  { id: 'spek', glyph: '◈', label: 'Spesifikasi & Material' },
  { id: 'cost', glyph: '◱', label: 'Build Up Cost & VE' },
  { id: 'bmw', glyph: '◬', label: 'Biaya–Mutu–Waktu' },
  { id: 'gbr', glyph: '◫', label: 'Gambar Komposit' },
  { id: 'bq', glyph: '≡', label: 'BQ / RAB' },
]

/** Assistant tools — grouped apart from the six project screens. */
const assistantItems: { id: ScreenId; glyph: string; label: string }[] = [
  { id: 'chat', glyph: '✦', label: 'Asisten AI' },
  { id: 'know', glyph: '◇', label: 'Pengetahuan' },
]

export function Sidebar({
  screen,
  onNavigate,
}: {
  screen: ScreenId
  onNavigate: (s: ScreenId) => void
}) {
  const { sidebarTheme } = useSettings()
  const dark = sidebarTheme === 'gelap'
  const bg = dark ? color.sidebarDark : color.sidebarLight
  const fg = dark ? color.onDark : '#2A2D25'
  const hairline = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'
  const wash = dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)'
  const activeWash = dark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.07)'

  const groupLabel = {
    font: mono('500 10px/1'),
    letterSpacing: '.09em',
    color: '#787E72',
    padding: '4px 10px 10px',
  } as const

  const renderLink = (item: { id: ScreenId; glyph: string; label: string }) => (
    <a
      key={item.id}
      href="#"
      className="nav-link"
      onClick={(e) => {
        e.preventDefault()
        onNavigate(item.id)
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 10px',
        borderRadius: 6,
        font: sans('500 13px'),
        color: fg,
        background: screen === item.id ? activeWash : 'transparent',
      }}
    >
      <span
        style={{
          width: 16,
          flex: 'none',
          textAlign: 'center',
          font: mono('400 13px'),
          color: color.greenLeaf,
        }}
      >
        {item.glyph}
      </span>
      {item.label}
    </a>
  )

  return (
    <aside
      style={{
        width: layout.sidebarWidth,
        flex: 'none',
        background: bg,
        color: fg,
        display: 'flex',
        flexDirection: 'column',
        padding: '0 0 14px',
      }}
    >
      <div
        style={{
          padding: '20px 18px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: `1px solid ${hairline}`,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            flex: 'none',
            borderRadius: 5,
            background: color.greenLeaf,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: mono('600 12px'),
            color: color.sidebarDark,
          }}
        >
          CH
        </div>
        <div>
          <div style={{ font: sans('600 13px/1.2'), letterSpacing: '-.01em' }}>
            Feasibility Studio
          </div>
          <div style={{ font: mono('400 10.5px/1.3'), color: color.onDarkFaint, marginTop: 2 }}>
            Cipta Harmoni Lestari
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '14px 10px', flex: 1 }}>
        <div style={groupLabel}>MENU</div>
        {items.map(renderLink)}

        <div style={{ ...groupLabel, paddingTop: 18 }}>ASISTEN</div>
        {assistantItems.map(renderLink)}
      </nav>

      <div
        style={{
          margin: '0 12px',
          padding: '11px 12px',
          borderRadius: 7,
          background: wash,
          fontFamily: font.mono,
          fontSize: 10.5,
          lineHeight: 1.5,
          color: dark ? '#9AA093' : color.muted,
        }}
      >
        {priceBasis.line1}
        <br />
        <span style={{ color: dark ? color.onDark : color.ink }}>{priceBasis.line2}</span>
      </div>
    </aside>
  )
}
