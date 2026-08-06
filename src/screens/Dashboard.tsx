import { fetchDashboard, keys } from '@/api'
import { Chip, ErrorPanel, LoadingPanel } from '@/components/primitives'
import { useResource } from '@/hooks/useResource'
import { card, cardClipped } from '@/theme/styles'
import { color, mono, sans } from '@/theme/tokens'
import type { DashboardData, ModuleCard, ScreenId } from '@/types'

export function Dashboard({
  projectId,
  onNavigate,
}: {
  projectId: string
  onNavigate: (s: ScreenId) => void
}) {
  const { data, loading, error } = useResource<DashboardData>(keys.dashboard(projectId), () =>
    fetchDashboard(projectId),
  )

  if (loading) return <LoadingPanel />
  if (error) return <ErrorPanel error={error} />
  if (!data) return null

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 20,
          marginBottom: 22,
        }}
      >
        <div>
          <div style={{ font: sans('600 21px/1.2'), letterSpacing: '-.02em' }}>{data.greeting}</div>
          <div style={{ font: sans('400 13px/1.5'), color: color.muted, marginTop: 5 }}>
            {data.subtitle}
          </div>
        </div>
        <div
          style={{
            font: mono('400 11px/1.5'),
            color: color.faint,
            textAlign: 'right',
            whiteSpace: 'pre-line',
          }}
        >
          {data.versionNote}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 14,
          marginBottom: 26,
        }}
      >
        {data.kpis.map((kpi) => (
          <div key={kpi.label} style={{ ...card, padding: '16px 17px' }}>
            <div style={{ font: sans('500 11px'), color: color.muted, letterSpacing: '.01em' }}>
              {kpi.label}
            </div>
            <div
              style={{
                font: mono('600 24px/1.15'),
                margin: '9px 0 7px',
                letterSpacing: '-.02em',
                color: kpi.valueColor,
              }}
            >
              {kpi.value}
              {kpi.unit && <span style={{ fontSize: 14, color: color.muted }}>{kpi.unit}</span>}
            </div>
            <div style={{ font: mono('500 11px'), color: kpi.noteColor }}>{kpi.note}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18, alignItems: 'start' }}>
        <div>
          <div
            style={{
              font: sans('600 12px'),
              letterSpacing: '.02em',
              color: color.muted,
              marginBottom: 11,
            }}
          >
            MODUL FEASIBILITY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
            {data.modules.map((m) => (
              <ModuleTile key={m.screen} module={m} onOpen={() => onNavigate(m.screen)} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardClipped}>
            <div
              style={{
                padding: '13px 16px',
                borderBottom: `1px solid ${color.borderSoft}`,
                font: sans('600 12.5px'),
              }}
            >
              Perlu perhatian
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data.alerts.map((a, i) => (
                <div
                  key={a.title}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '12px 16px',
                    borderBottom:
                      i === data.alerts.length - 1 ? undefined : `1px solid ${color.rowLine}`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: a.severity === 'critical' ? color.red : color.amber,
                      marginTop: 5,
                      flex: 'none',
                    }}
                  />
                  <div>
                    <div style={{ font: sans('500 12.5px/1.4') }}>{a.title}</div>
                    <div style={{ font: mono('400 11px/1.5'), color: color.faint, marginTop: 3 }}>
                      {a.meta}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={cardClipped}>
            <div
              style={{
                padding: '13px 16px',
                borderBottom: `1px solid ${color.borderSoft}`,
                font: sans('600 12.5px'),
              }}
            >
              Aktivitas terakhir
            </div>
            <div
              style={{
                padding: '6px 16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 11,
                font: mono('400 11.5px/1.5'),
                color: color.muted,
              }}
            >
              {data.activity.map((item, i) => (
                <div key={item.title} style={{ paddingTop: i === 0 ? 8 : undefined }}>
                  <span style={{ color: color.ink }}>{item.title}</span>
                  <br />
                  {item.meta}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function ModuleTile({ module: m, onOpen }: { module: ModuleCard; onOpen: () => void }) {
  return (
    <div
      className="module-card"
      style={{
        ...card,
        padding: 17,
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        gridColumn: m.wide ? 'span 2' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ font: mono('400 15px'), color: color.green }}>{m.glyph}</span>
        <Chip tone={m.badgeTone}>{m.badge}</Chip>
      </div>
      <div style={{ font: sans('600 14px') }}>{m.title}</div>
      <div style={{ font: sans('400 12px/1.55'), color: color.muted, flex: m.wide ? undefined : 1 }}>
        {m.body}
      </div>
      <a
        href="#"
        className={m.wide ? 'btn-primary' : 'btn-outline'}
        onClick={(e) => {
          e.preventDefault()
          onOpen()
        }}
        style={
          m.wide
            ? {
                alignSelf: 'flex-start',
                font: sans('500 12px'),
                color: color.surface,
                background: color.green,
                borderRadius: 6,
                padding: '7px 15px',
              }
            : {
                alignSelf: 'flex-start',
                font: sans('500 12px'),
                color: color.green,
                border: `1px solid ${color.greenLine}`,
                borderRadius: 6,
                padding: '6px 13px',
              }
        }
      >
        Buka
      </a>
    </div>
  )
}
