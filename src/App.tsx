import { useCallback, useEffect, useState } from 'react'
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
import { useViewport } from '@/hooks/useViewport'
import { BiayaMutuWaktu } from '@/screens/BiayaMutuWaktu'
import { BqRab } from '@/screens/BqRab'
import { BuildUpCost } from '@/screens/BuildUpCost'
import { ChatBot } from '@/screens/ChatBot'
import { Dashboard } from '@/screens/Dashboard'
import { GambarKomposit } from '@/screens/GambarKomposit'
import { Knowledge } from '@/screens/Knowledge'
import { Spesifikasi } from '@/screens/Spesifikasi'
import { SettingsProvider, useSettings } from '@/state/settings'
import { color, layout, sans } from '@/theme/tokens'
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

  const { isPhone, isNarrow } = useViewport()
  const [screen, setScreen] = useState<ScreenId>('dash')
  const [navOpen, setNavOpen] = useState(false)
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
    // On a phone the sidebar covers the screen it just navigated to.
    setNavOpen(false)
  }, [])

  // Widening the window back to a desktop layout leaves no overlay to close.
  useEffect(() => {
    if (!isNarrow) setNavOpen(false)
  }, [isNarrow])

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

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
    <div
      style={{
        display: 'flex',
        // Mobile browsers report 100vh as the height without their chrome, so
        // the bottom of the app sits under the address bar. `dvh` tracks it.
        height: '100dvh',
        overflow: 'hidden',
        background: color.appBg,
      }}
    >
      {isNarrow ? (
        navOpen && (
          <>
            <div
              onClick={() => setNavOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(27,29,24,.34)', zIndex: 70 }}
            />
            <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 71 }}>
              <Sidebar screen={screen} onNavigate={navigate} onClose={() => setNavOpen(false)} />
            </div>
          </>
        )
      ) : (
        <Sidebar screen={screen} onNavigate={navigate} />
      )}

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
          onOpenNav={isNarrow ? () => setNavOpen(true) : undefined}
        />

        <main
          style={{
            flex: 1,
            overflow: 'auto',
            padding: isPhone ? '16px 14px 80px' : isNarrow ? '20px 20px 70px' : '26px 30px 60px',
          }}
        >
          <div style={{ maxWidth: layout.contentMaxWidth, margin: '0 auto' }}>
            {isPhone && (
              <h1
                style={{
                  margin: '0 0 14px',
                  font: sans('600 17px/1.25'),
                  letterSpacing: '-.02em',
                  color: color.ink,
                }}
              >
                {titles[screen]}
              </h1>
            )}
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
