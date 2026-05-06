import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import { apiRequest } from "@/lib/api"

interface UiPrefs {
  defaultRoute: string
}

interface ConfigData {
  chainHome: string
  source: string
  configPath?: string
  envOverrideActive: boolean
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
  const [uiPrefs, setUiPrefs] = useState<UiPrefs>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hub-ui-prefs")
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          // ignore
        }
      }
    }
    return { defaultRoute: "skills" }
  })

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
