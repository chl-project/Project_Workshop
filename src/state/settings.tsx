import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type SidebarTheme = 'gelap' | 'terang'

interface Settings {
  sidebarTheme: SidebarTheme
  showAiBanner: boolean
  setSidebarTheme: (t: SidebarTheme) => void
  setShowAiBanner: (v: boolean) => void
}

const SettingsContext = createContext<Settings | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [sidebarTheme, setSidebarTheme] = useState<SidebarTheme>('gelap')
  const [showAiBanner, setShowAiBanner] = useState(true)

  const value = useMemo(
    () => ({ sidebarTheme, showAiBanner, setSidebarTheme, setShowAiBanner }),
    [sidebarTheme, showAiBanner],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}
