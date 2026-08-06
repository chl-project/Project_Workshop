import { useCallback, useState } from 'react'
import { fetchProjects, keys } from '@/api'
import { Header, type ProjectAction } from '@/components/Header'
import { DeleteProjectDialog, ProjectDialog } from '@/components/ProjectDialog'
import {
  createProject,
  deleteProject,
  duplicateProject,
  updateProject,
  type ProjectInput,
  type Registry,
} from '@/lib/projects'
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
  /** Local overlay on the fetched registry, so mutations show without a reload. */
  const [registry, setRegistry] = useState<Registry | null>(null)
  const [dialog, setDialog] = useState<{ action: ProjectAction; project?: Project } | null>(null)
  /** Bumped after a mutation to force screens to re-read their endpoints. */
  const [dataVersion, setDataVersion] = useState(0)

  const navigate = useCallback((next: ScreenId) => {
    setScreen(next)
    setProjectMenuOpen(false)
  }, [])

  const closeDrawer = useCallback(() => setDrawer(null), [])

  const projects = registry?.projects ?? projectsResource.data?.projects ?? []
  const activeId = registry?.activeId ?? projectsResource.data?.activeId ?? ''
  const projectId = selectedProject ?? activeId

  /** Applies a mutation's result: new list, active project, and fresh reads. */
  const applyRegistry = (next: Registry, focusId?: string) => {
    setRegistry(next)
    setSelectedProject(focusId ?? next.activeId)
    setDataVersion((v) => v + 1)
    setDialog(null)
    setDrawer(null)
    setProjectMenuOpen(false)
  }

  const onProjectAction = (action: ProjectAction, project?: Project) => {
    setProjectMenuOpen(false)
    setDialog({ action, project })
  }

  const submitDialog = async (input: ProjectInput) => {
    if (!dialog) return
    if (dialog.action === 'create') {
      applyRegistry(await createProject(input))
    } else if (dialog.action === 'edit' && dialog.project) {
      applyRegistry(await updateProject(dialog.project.id, input), dialog.project.id)
    } else if (dialog.action === 'duplicate' && dialog.project) {
      applyRegistry(await duplicateProject(dialog.project.id, input.name))
    }
  }

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
          onProjectAction={onProjectAction}
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
                // Remounts on a project switch or a mutation, so every screen
                // re-reads rather than showing the previous project's figures.
                key={`${projectId}:${dataVersion}`}
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

      {dialog && dialog.action !== 'delete' && (
        <ProjectDialog
          mode={dialog.action}
          project={dialog.project}
          onClose={() => setDialog(null)}
          onSubmit={submitDialog}
        />
      )}
      {dialog?.action === 'delete' && dialog.project && (
        <DeleteProjectDialog
          project={dialog.project}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            applyRegistry(await deleteProject(dialog.project!.id))
          }}
        />
      )}

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
          onNavigate={onNavigate}
        />
      )
    case 'bmw':
      return <BiayaMutuWaktu projectId={projectId} onNavigate={onNavigate} />
    case 'gbr':
      return (
        <GambarKomposit
          projectId={projectId}
          onOpenClash={(no) => onOpenDrawer({ kind: 'clash', no })}
          onNavigate={onNavigate}
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
