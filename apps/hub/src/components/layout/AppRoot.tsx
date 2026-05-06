import { useState, useEffect } from "react"
import { HubShell } from "@/components/layout/HubShell"
import { OverlayRoots } from "@/components/layout/OverlayRoots"
import { PreviewModalShell } from "@/components/layout/PreviewModalShell"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import * as Views from "@/components/views"

import { HubProvider, useHub } from "@/lib/HubContext"

function AppRouter() {
  const { uiPrefs } = useHub()
  const [route, setRoute] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.location.hash.replace(/^#/, "") || uiPrefs.defaultRoute || "skills"
    }
    return "skills"
  })

  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = window.location.hash.replace(/^#/, "") || "skills"
      setRoute(nextRoute)
    }
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  const renderView = () => {
    switch (route) {
      case "skills":
        return <Views.SkillsView />
      case "rules":
        return <Views.RulesView />
      case "agents":
        return <Views.AgentsView />
      case "workflows":
        return <Views.WorkflowsView />
      case "config":
        return <Views.ConfigView />
      case "status":
        return <Views.StatusView />
      case "reflect":
        return <Views.ReflectView />
      case "improve":
        return <Views.ImproveView />
      case "registry":
        return <Views.RegistryView />
      default:
        return <Views.SkillsView />
    }
  }

  return (
    <HubShell currentRoute={route}>
      {renderView()}
    </HubShell>
  )
}

export function AppRoot() {
  return (
    <HubProvider>
      <TooltipProvider>
        <AppRouter />
        <OverlayRoots />
        <PreviewModalShell />
        <Toaster />
      </TooltipProvider>
    </HubProvider>
  )
}
