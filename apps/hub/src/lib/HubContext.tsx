import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import { apiRequest } from "@/lib/api"

interface UiPrefs {
  defaultRoute: string
  theme: "dark" | "light" | "system"
  sidebarCollapsed: boolean
  skillsViewMode: "grid" | "list"
}

interface ConfigData {
  chainHome: string
  source: string
  configPath?: string
  envOverrideActive: boolean
  configuredChainHome: string | null
  status: any
  systemInfo?: {
    platform: string
    arch: string
    nodeVersion: string
    bunVersion: string | null
    uptime: number
  }
}

interface HubContextType {
  config: ConfigData | null
  uiPrefs: UiPrefs
  updateUiPrefs: (prefs: Partial<UiPrefs>) => void
  refreshConfig: () => Promise<void>
}

const HubContext = createContext<HubContextType | undefined>(undefined)

export function HubProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [uiPrefs, setUiPrefs] = useState<UiPrefs>({ 
    defaultRoute: "skills",
    theme: "dark",
    sidebarCollapsed: false,
    skillsViewMode: "grid"
  })

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem("hub-ui-prefs")
    if (stored) {
      try {
        setUiPrefs(JSON.parse(stored))
      } catch {
        // ignore
      }
    }
    refreshConfig()
  }, [])

  const refreshConfig = async () => {
    try {
      const data = await apiRequest<ConfigData>("/api/config")
      setConfig(data)
    } catch (err) {
      console.error("Failed to fetch config", err)
    }
  }

  const updateUiPrefs = (newPrefs: Partial<UiPrefs>) => {
    const updated = { ...uiPrefs, ...newPrefs }
    setUiPrefs(updated)
    localStorage.setItem("hub-ui-prefs", JSON.stringify(updated))
  }

  useEffect(() => {
    refreshConfig()
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (uiPrefs.theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.add(systemTheme)
    } else {
      root.classList.add(uiPrefs.theme)
    }
  }, [uiPrefs.theme])

  return (
    <HubContext.Provider value={{ config, uiPrefs, updateUiPrefs, refreshConfig }}>
      {children}
    </HubContext.Provider>
  )
}

export function useHub() {
  const context = useContext(HubContext)
  if (context === undefined) {
    throw new Error("useHub must be used within a HubProvider")
  }
  return context
}
