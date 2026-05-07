import { useState, useEffect } from "react"
import { useHub } from "@/lib/HubContext"
import { apiRequest } from "@/lib/api"
import { ViewHeader } from "@/components/layout/ViewHeader"
import { ViewContainer } from "@/components/layout/ViewContainer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Save, 
  Info, 
  ExternalLink, 
  Settings2,
  Loader2,
  AppWindow,
  Monitor,
  Moon,
  Sun,
  Grid,
  List,
  Terminal,
  ShieldCheck,
  Zap,
  Lock
} from "lucide-react"
import { toast } from "sonner"

export function ConfigView() {
  const { config, uiPrefs, updateUiPrefs, refreshConfig } = useHub()
  const [chainHome, setChainHome] = useState(config?.chainHome || "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config?.chainHome) {
      setChainHome(config.chainHome)
    }
  }, [config?.chainHome])

  const saveChainHome = async () => {
    try {
      setSaving(true)
      await apiRequest("/api/config", {
        method: "POST",
        body: { chainHome }
      })
      await refreshConfig()
      toast.success("Configuration updated successfully")
    } catch (err: any) {
      toast.error(`Failed to save config: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const resetUiPrefs = () => {
    updateUiPrefs({
      theme: 'system',
      defaultRoute: 'skills',
      skillsViewMode: 'grid',
      sidebarCollapsed: false
    })
    toast.success("UI preferences reset to defaults")
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="size-8 animate-spin text-hub-accent" />
        <p className="text-hub-text-dim text-sm animate-pulse">Loading configuration...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ViewHeader 
        title="Configuration" 
        description="Manage your global Chain Hub settings and environment variables."
      >
        <Button 
          onClick={saveChainHome} 
          disabled={saving || chainHome === config.chainHome}
          className="bg-hub-accent hover:bg-hub-accent/90 text-white shadow-lg shadow-hub-accent/20 h-10 px-6 gap-2"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Changes
        </Button>
      </ViewHeader>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
          <ViewContainer className="p-6 space-y-8">
            {/* CLI CORE CONFIGURATION */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-white text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="size-4 text-hub-accent" />
                  CLI Core Configuration
                </h2>
                {config.envOverrideActive && (
                  <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 bg-yellow-500/5 gap-1.5 px-2 py-0.5">
                    <Zap className="size-3" />
                    ENV OVERRIDE
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[0.7rem] uppercase tracking-widest text-hub-text-faint font-semibold">CHAIN_HOME Path</Label>
                    <span className="text-[0.65rem] text-hub-text-dim font-hub-mono opacity-50">{config.source}</span>
                  </div>
                  <div className="relative">
                    <Input 
                      value={chainHome} 
                      onChange={(e) => setChainHome(e.target.value)}
                      placeholder="/Users/you/chain-hub"
                      className="bg-hub-bg/50 border-hub-border-strong text-hub-text h-11 pl-4 font-hub-mono text-[0.85rem] focus-visible:ring-hub-accent/30"
                      onKeyDown={(e) => e.key === "Enter" && saveChainHome()}
                    />
                  </div>
                  <div className="flex items-start gap-2 bg-hub-bg/30 p-3 rounded-lg border border-hub-border/30">
                    <Info className="size-4 mt-0.5 text-hub-accent-dim shrink-0" />
                    <p className="text-[0.75rem] text-hub-text-dim leading-relaxed">
                      This is the root directory where your skills, rules, and agents are stored. Changing this will point the dashboard to a different hub.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-hub-border/50" />

            {/* DASHBOARD PREFERENCES */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-white text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <AppWindow className="size-4 text-hub-accent" />
                  Dashboard Preferences
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetUiPrefs}
                  className="h-8 text-[0.65rem] text-hub-text-faint hover:text-white uppercase tracking-widest font-bold"
                >
                  Reset Defaults
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                <div className="space-y-3">
                  <Label className="text-[0.7rem] uppercase tracking-widest text-hub-text-faint font-semibold">Appearance Theme</Label>
                  <div className="flex bg-hub-bg/50 p-1.5 rounded-xl border border-hub-border-strong">
                    <button 
                      onClick={() => updateUiPrefs({ theme: 'dark' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[0.75rem] font-medium transition-all ${uiPrefs.theme === 'dark' ? 'bg-hub-accent text-white shadow-lg' : 'text-hub-text-dim hover:text-hub-text'}`}
                    >
                      <Moon className="size-3.5" />
                      Dark
                    </button>
                    <button 
                      onClick={() => updateUiPrefs({ theme: 'light' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[0.75rem] font-medium transition-all ${uiPrefs.theme === 'light' ? 'bg-hub-accent text-white shadow-lg' : 'text-hub-text-dim hover:text-hub-text'}`}
                    >
                      <Sun className="size-3.5" />
                      Light
                    </button>
                    <button 
                      onClick={() => updateUiPrefs({ theme: 'system' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[0.75rem] font-medium transition-all ${uiPrefs.theme === 'system' ? 'bg-hub-accent text-white shadow-lg' : 'text-hub-text-dim hover:text-hub-text'}`}
                    >
                      <Monitor className="size-3.5" />
                      System
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[0.7rem] uppercase tracking-widest text-hub-text-faint font-semibold">Default View</Label>
                  <Select 
                    value={uiPrefs.defaultRoute} 
                    onValueChange={(val) => updateUiPrefs({ defaultRoute: val })}
                  >
                    <SelectTrigger className="w-full bg-hub-bg/50 border-hub-border-strong text-hub-text h-11 pl-4 focus:ring-hub-accent/30 rounded-xl">
                      <SelectValue placeholder="Select tab" />
                    </SelectTrigger>
                    <SelectContent className="bg-hub-surface-2 border-hub-border text-hub-text">
                      <SelectItem value="skills">Skills & Tools</SelectItem>
                      <SelectItem value="rules">Editor Rules</SelectItem>
                      <SelectItem value="agents">Agent Profiles</SelectItem>
                      <SelectItem value="workflows">Workflows</SelectItem>
                      <Separator className="my-1 opacity-20" />
                      <SelectItem value="registry">Registry Explorer</SelectItem>
                      <SelectItem value="improve">Autonomous Improve</SelectItem>
                      <SelectItem value="reflect">Reflect & Distill</SelectItem>
                      <SelectItem value="status">Health & Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[0.7rem] uppercase tracking-widest text-hub-text-faint font-semibold">Skills Display</Label>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => updateUiPrefs({ skillsViewMode: 'grid' })}
                      className={`flex-1 h-11 gap-2 border-hub-border-strong rounded-xl transition-all ${uiPrefs.skillsViewMode === 'grid' ? 'bg-hub-accent/10 border-hub-accent/50 text-hub-accent shadow-inner' : 'bg-hub-bg/50 text-hub-text-dim'}`}
                    >
                      <Grid className="size-4" />
                      Grid
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => updateUiPrefs({ skillsViewMode: 'list' })}
                      className={`flex-1 h-11 gap-2 border-hub-border-strong rounded-xl transition-all ${uiPrefs.skillsViewMode === 'list' ? 'bg-hub-accent/10 border-hub-accent/50 text-hub-accent shadow-inner' : 'bg-hub-bg/50 text-hub-text-dim'}`}
                    >
                      <List className="size-4" />
                      List
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ViewContainer>
        </div>

        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <ViewContainer className="p-5 space-y-5">
            <h2 className="text-hub-text text-xs font-bold uppercase tracking-widest flex items-center gap-2 opacity-80">
              <Info className="size-4 text-hub-accent" />
              Environment
            </h2>
            <div className="space-y-4">
              <div className="space-y-1.5 p-3 rounded-lg bg-hub-surface-1/50 border border-hub-border">
                <span className="text-hub-text-faint block uppercase text-[0.6rem] tracking-widest font-bold">Config File</span>
                <div className="flex items-center gap-2 group cursor-help" title={config.configPath}>
                  <span className="font-hub-mono text-[0.7rem] text-hub-text-dim truncate">{config.configPath || "Not found"}</span>
                  <ExternalLink className="size-3 opacity-30" />
                </div>
              </div>
              <div className="space-y-1.5 p-3 rounded-lg bg-hub-surface-1/50 border border-hub-border">
                <span className="text-hub-text-faint block uppercase text-[0.6rem] tracking-widest font-bold">CLI Version</span>
                <div className="flex items-center gap-2">
                  <span className="font-hub-mono text-[0.7rem] text-hub-text-dim">{config.systemInfo?.cliVersion || "..."}</span>
                  <ShieldCheck className="size-3.5 text-hub-accent/50" />
                </div>
              </div>
            </div>
          </ViewContainer>

          <ViewContainer className="p-5 space-y-5">
            <h2 className="text-hub-text text-xs font-bold uppercase tracking-widest flex items-center gap-2 opacity-80">
              <Lock className="size-4 text-hub-accent" />
              Persistence
            </h2>
            <p className="text-[0.72rem] text-hub-text-dim leading-relaxed italic opacity-70">
              Settings are persisted to your local filesystem. Browser-based preferences are stored in local storage.
            </p>
          </ViewContainer>
        </div>
      </div>
    </div>
  )
}
