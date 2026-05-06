import { useState, useEffect } from "react"
import { useHub } from "@/lib/HubContext"
import { apiRequest } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { toast } from "sonner"
import { Settings, Save, RefreshCw, Info } from "lucide-react"

export function ConfigView() {
  const { config, uiPrefs, updateUiPrefs, refreshConfig } = useHub()
  const [chainHome, setChainHome] = useState(config?.chainHome || "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config) {
      setChainHome(config.chainHome)
    }
  }, [config])

  const saveChainHome = async () => {
    try {
      setSaving(true)
      const payload: any = await apiRequest("/api/config/chain-home", {
        method: "POST",
        body: { chainHome },
      })
      
      toast.success(payload.envOverrideActive 
        ? "CHAIN_HOME saved, but env override is still active." 
        : "CHAIN_HOME updated successfully.")
      
      await refreshConfig()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!config) {
    return <div className="p-4 text-hub-text-dim">Loading configuration...</div>
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-4 mb-4">
        <h1 className="m-0 font-hub-display text-[1.05rem] tracking-wide text-[#f5f8ff]">Configuration</h1>
      </header>

      <Card className="border-hub-border bg-hub-surface-1/85 p-4 space-y-4 rounded-md">
        <div className="space-y-2">
          <Label className="text-[0.73rem] uppercase tracking-wide text-hub-text-faint">CHAIN_HOME Path</Label>
          <div className="flex gap-2">
            <Input 
              value={chainHome} 
              onChange={(e) => setChainHome(e.target.value)}
              placeholder="/Users/you/chain-hub"
              className="bg-hub-bg border-hub-border-strong text-hub-text h-9"
              onKeyDown={(e) => e.key === "Enter" && saveChainHome()}
            />
            <Button 
              onClick={saveChainHome} 
              disabled={saving || chainHome === config.chainHome}
              className="bg-hub-accent hover:bg-hub-accent/90 text-white h-9 px-4 gap-2 shrink-0"
            >
              <Save className="size-3.5" />
              Save
            </Button>
          </div>
          <p className="text-[0.74rem] text-hub-text-faint flex items-center gap-1.5">
            <Info className="size-3" />
            {config.envOverrideActive
              ? "Env override is active: saved config may still be overridden by CHAIN_HOME env."
              : "Stored in the CLI config (~/.config/chain-hub/config.json)."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-[0.74rem] text-hub-text-dim border-t border-hub-border/50">
          <div className="space-y-1">
            <span className="text-hub-text-faint block uppercase text-[0.65rem] tracking-tight">Active Source</span>
            <span className="font-hub-mono">{config.source}</span>
          </div>
          <div className="space-y-1">
            <span className="text-hub-text-faint block uppercase text-[0.65rem] tracking-tight">Config Path</span>
            <span className="font-hub-mono truncate block" title={config.configPath}>{config.configPath || "-"}</span>
          </div>
        </div>
      </Card>

      <Card className="border-hub-border bg-hub-surface-1/85 p-4 space-y-4 rounded-md">
        <h2 className="text-[0.86rem] text-[#f3f6ff] font-medium flex items-center gap-2">
          <Settings className="size-4" />
          Hub UI Preferences
        </h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[0.73rem] uppercase tracking-wide text-hub-text-faint">Default Start Tab</Label>
            <Select 
              value={uiPrefs.defaultRoute} 
              onValueChange={(val) => updateUiPrefs({ defaultRoute: val })}
            >
              <SelectTrigger className="w-full bg-hub-bg border-hub-border-strong text-hub-text h-9">
                <SelectValue placeholder="Select tab" />
              </SelectTrigger>
              <SelectContent className="bg-hub-surface-2 border-hub-border text-hub-text">
                <SelectItem value="skills">Skills</SelectItem>
                <SelectItem value="config">Configuration</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="registry">Registry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-[0.72rem] text-hub-text-faint italic">
            These settings are stored locally in your browser and do not affect the CLI.
          </p>
        </div>
      </Card>

      <Card className="border-hub-border bg-hub-surface-1/85 p-4 space-y-3 rounded-md">
        <h2 className="text-[0.86rem] text-[#f3f6ff] font-medium">Runtime Actions</h2>
        <p className="text-[0.74rem] text-hub-text-faint">
          Run maintenance to relink adapters and refresh protected core assets for the active CHAIN_HOME.
        </p>
        <Button 
          variant="outline" 
          onClick={() => window.location.hash = "#status"}
          className="h-9 border-hub-border bg-hub-surface-2 text-hub-text hover:bg-hub-surface-3 transition-colors"
        >
          Manage Adapter Health & Maintenance
        </Button>
      </Card>
    </div>
  )
}
