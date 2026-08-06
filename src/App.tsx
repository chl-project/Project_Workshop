import { useCallback, useState } from 'react'
import { fetchProjects, keys } from '@/api'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { TweaksPanel } from '@/components/TweaksPanel'
import { LoadingPanel } from '@/components/primitives'
import { ClashDrawer } from '@/drawers/ClashDrawer'
import { VeDrawer } from '@/drawers/VeDrawer'
import { VolumeDrawer } from '@/drawers/VolumeDrawer'
import type { DrawerRequest } from '@/drawers/Drawer'
import { useResource } from '@/hooks/useResource'
import { BiayaMutuWaktu } from '@/screens/BiayaMutuWaktu'
import { BqRab } from '@/screens/BqRab'
import { BuildUpCost } from '@/screens/BuildUpCost'
import { ChatBot } from '@/screens/ChatBot'
import { Dashboard } from '@/screens/Dashboard'
import { GambarKomposit } from '@/screens/GambarKomposit'
import { Knowledge } from '@/screens/Knowledge'
import { Spesifikasi } from '@/screens/Spesifikasi'
import { SettingsProvider, useSettings } from '@/state/settings'
import { color, layout } from '@/theme/tokens'
import type { Project, ScreenId } from '@/types'

const titles: Record<ScreenId, string> = {
  dash: 'Dashboard',
  spek: 'Spesifikasi & Material',
  cost: 'Build Up Cost & VE',
  bmw: 'Biaya–Mutu–Waktu',
  gbr: 'Gambar Komposit',
  bq: 'BQ / RAB',
  know: 'Pengetahuan',
  chat: 'Asisten AI',
}

export default function App() {
  return (
    <SettingsProvider>
      <Studio />
    </SettingsProvider>
  )
}

function Studio() {
  const { showAiBanner } = useSettings()
  const projectsResource = useResource<{ projects: Project[]; activeId: string }>(
    keys.projects,
    fetchProjects,
  )

  const [screen, setScreen] = useState<ScreenId>('dash')
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [drawer, setDrawer] = useState<DrawerRequest>(null)

  const navigate = useCallback((next: ScreenId) => {
    setScreen(next)
    setProjectMenuOpen(false)
  }, [])

  const closeDrawer = useCallback(() => setDrawer(null), [])

  const projects = projectsResource.data?.projects ?? []
  const projectId = selectedProject ?? projectsResource.data?.activeId ?? ''

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: color.appBg }}>
      <Sidebar screen={screen} onNavigate={navigate} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          title={titles[screen]}
          projects={projects}
          activeProjectId={projectId}
          onSelectProject={(id) => {
            setSelectedProject(id)
            setProjectMenuOpen(false)
          }}
          open={projectMenuOpen}
          onToggle={() => setProjectMenuOpen((v) => !v)}
          onClose={() => setProjectMenuOpen(false)}
        />

        <main style={{ flex: 1, overflow: 'auto', padding: '26px 30px 60px' }}>
          <div style={{ maxWidth: layout.contentMaxWidth, margin: '0 auto' }}>
            {!projectId ? (
              <LoadingPanel label="Memuat proyek…" />
            ) : (
              <Screen
                screen={screen}
                projectId={projectId}
                showAiBanner={showAiBanner}
                onNavigate={navigate}
                onOpenDrawer={setDrawer}
              />
            )}
          </div>
        </main>
      </div>

      {drawer?.kind === 'volume' && (
        <VolumeDrawer itemNo={drawer.itemNo} onClose={closeDrawer} onNavigate={navigate} />
      )}
      {drawer?.kind === 've' && (
        <VeDrawer veId={drawer.id} onClose={closeDrawer} onNavigate={navigate} />
      )}
      {drawer?.kind === 'clash' && <ClashDrawer no={drawer.no} onClose={closeDrawer} />}

      <TweaksPanel />
    </div>
  )
}

function Screen({
  screen,
  projectId,
  showAiBanner,
  onNavigate,
  onOpenDrawer,
}: {
  screen: ScreenId
  projectId: string
  showAiBanner: boolean
  onNavigate: (s: ScreenId) => void
  onOpenDrawer: (req: DrawerRequest) => void
}) {
  switch (screen) {
    case 'dash':
      return <Dashboard projectId={projectId} onNavigate={onNavigate} />
    case 'spek':
      return <Spesifikasi projectId={projectId} onNavigate={onNavigate} />
    case 'cost':
      return (
        <BuildUpCost
          projectId={projectId}
          showAiBanner={showAiBanner}
          onOpenVe={(id) => onOpenDrawer({ kind: 've', id })}
        />
      )
    case 'bmw':
      return <BiayaMutuWaktu projectId={projectId} />
    case 'gbr':
      return (
        <GambarKomposit
          projectId={projectId}
          onOpenClash={(no) => onOpenDrawer({ kind: 'clash', no })}
        />
      )
    case 'bq':
      return (
        <BqRab
          projectId={projectId}
          showAiBanner={showAiBanner}
          onOpenVolume={(itemNo) => onOpenDrawer({ kind: 'volume', itemNo })}
          onNavigate={onNavigate}
        />
      )
    case 'know':
      return <Knowledge projectId={projectId} onNavigate={onNavigate} />
    case 'chat':
      return <ChatBot projectId={projectId} onNavigate={onNavigate} />
  }
}
