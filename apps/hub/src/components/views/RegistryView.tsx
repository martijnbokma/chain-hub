import { useState, useEffect, useMemo } from "react"
import { apiRequest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  GitBranch, 
  Download, 
  Trash2, 
  AlertTriangle,
  Globe,
  Monitor,
  CheckCircle2,
  Loader2,
  Plus
} from "lucide-react"
import { toast } from "sonner"
import { useHub } from "@/lib/HubContext"

interface RegistrySkill {
  slug: string
  description?: string
  source: string
  version: string
  inRegistry?: boolean
  isLocalOnly?: boolean
}

interface RegistryData {
  skills: RegistrySkill[]
  source: string
}

interface LocalSkill {
  slug: string
  description?: string
  isCore: boolean
  bucket: string
}

export function RegistryView() {
  const { refreshConfig } = useHub()
  const [allSkills, setAllSkills] = useState<RegistrySkill[]>([])
  const [installedSlugs, setInstalledSlugs] = useState<Set<string>>(new Set())
  const [removableSlugs, setRemovableSlugs] = useState<Set<string>>(new Set())
  const [source, setSource] = useState("live")
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [githubInput, setGithubInput] = useState("")

  const loadData = async () => {
    try {
      setLoading(true)
      const [regRes, skillRes] = await Promise.all([
        apiRequest<RegistryData>("/api/registry"),
        apiRequest<{ skills: LocalSkill[] }>("/api/skills")
      ])

      setAllSkills(regRes.skills || [])
      setSource(regRes.source || "live")

      const localSlugs = new Set((skillRes.skills || []).map(s => s.slug))
      const remSlugs = new Set((skillRes.skills || []).filter(s => !s.isCore).map(s => s.slug))
      
      setInstalledSlugs(localSlugs)
      setRemovableSlugs(remSlugs)
    } catch (err: any) {
      toast.error(`Failed to load registry: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const combinedSkills = useMemo(() => {
    const bySlug = new Map<string, RegistrySkill>()
    
    // Add registry skills
    allSkills.forEach(skill => {
      bySlug.set(skill.slug, { ...skill, inRegistry: true, isLocalOnly: false })
    })

    // This logic is simplified - we mostly care about what's in registry vs local
    return Array.from(bySlug.values())
  }, [allSkills])

  const filteredSkills = useMemo(() => {
    let scoped = combinedSkills
    if (filter === "registry") {
      scoped = combinedSkills.filter(s => s.inRegistry)
    } else if (filter === "installed") {
      scoped = combinedSkills.filter(s => installedSlugs.has(s.slug))
    }

    const query = searchQuery.toLowerCase().trim()
    if (!query) return scoped
    return scoped.filter(s => 
      s.slug.toLowerCase().includes(query) || 
      (s.description || "").toLowerCase().includes(query)
    )
  }, [combinedSkills, filter, searchQuery, installedSlugs])

  const handleInstall = async (slug: string) => {
    try {
      setInstalling(slug)
      await apiRequest("/api/registry/install", {
        method: "POST",
        body: JSON.stringify({ slug })
      })
      toast.success(`Installed ${slug}`)
      await loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setInstalling(null)
    }
  }

  const handleUninstall = async (slug: string) => {
    if (!confirm(`Uninstall "${slug}"?`)) return
    try {
      setInstalling(slug)
      await apiRequest(`/api/skills/${encodeURIComponent(slug)}`, { method: "DELETE" })
      toast.success(`Uninstalled ${slug}`)
      await loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setInstalling(null)
    }
  }

  const handleGithubInstall = async () => {
    const trimmed = githubInput.trim()
    if (!trimmed) return
    if (!/^[^/\s]+\/[^/\s]+$/.test(trimmed)) {
      toast.error("Invalid GitHub reference. Use owner/repo.")
      return
    }
    const ref = `github:${trimmed}`
    await handleInstall(ref)
    setGithubInput("")
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="m-0 font-hub-display text-[1.05rem] tracking-wide text-[#f5f8ff]">Registry</h1>
          <p className="text-[0.7rem] text-hub-text-faint uppercase tracking-wider mt-1">
            Registry Source: <span className="text-hub-accent font-bold">{source}</span>
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All Skills", icon: Globe },
          { id: "registry", label: "From Registry", icon: Download },
          { id: "installed", label: "Installed", icon: CheckCircle2 }
        ].map(btn => (
          <Button
            key={btn.id}
            variant={filter === btn.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(btn.id)}
            className={`h-8 gap-2 border-hub-border ${filter === btn.id ? "bg-hub-accent text-white" : "text-hub-text-dim hover:text-white"}`}
          >
            <btn.icon className="size-3.5" />
            {btn.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4 items-start">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-hub-text-faint" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search registry by name or description..."
              className="pl-10 h-10 bg-hub-surface-2 border-hub-border-strong text-hub-text"
            />
          </div>

          <div className="grid gap-2">
            {loading ? (
              <div className="p-12 text-center text-hub-text-dim">Loading registry...</div>
            ) : filteredSkills.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-hub-border rounded-lg text-hub-text-dim text-sm">
                No matching skills found in the registry.
              </div>
            ) : (
              filteredSkills.map((skill) => {
                const isInstalled = installedSlugs.has(skill.slug)
                const canUninstall = removableSlugs.has(skill.slug)
                const isActionLoading = installing === skill.slug

                return (
                  <div 
                    key={skill.slug}
                    className="flex items-center justify-between p-4 rounded-lg border border-hub-border bg-hub-surface-1/40 hover:bg-hub-surface-2/60 transition-colors group"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{skill.slug}</span>
                        <Badge variant="outline" className="text-[0.6rem] h-4 border-hub-border-strong text-hub-text-faint px-1">
                          {skill.version}
                        </Badge>
                      </div>
                      <p className="text-[0.78rem] text-hub-text-dim line-clamp-2 leading-relaxed">
                        {skill.description}
                      </p>
                      <div className="mt-2 text-[0.65rem] text-hub-text-faint uppercase font-bold tracking-wider">
                        Source: {skill.source}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isInstalled ? (
                        canUninstall ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleUninstall(skill.slug)}
                            disabled={!!installing}
                            className="h-8 border-hub-err/30 text-hub-err/70 hover:bg-hub-err/10 hover:text-hub-err"
                          >
                            {isActionLoading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Trash2 className="size-3.5 mr-1.5" />}
                            Uninstall
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-hub-success/10 border border-hub-success/20 text-hub-success text-[0.7rem] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="size-3.5" />
                            Installed
                          </div>
                        )
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleInstall(skill.slug)}
                          disabled={!!installing}
                          className="h-8 bg-hub-accent hover:bg-hub-accent/90 text-white"
                        >
                          {isActionLoading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Download className="size-3.5 mr-1.5" />}
                          Install
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-hub-border bg-hub-surface-2/40 space-y-4">
            <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest">
              <GitBranch className="size-4 text-hub-accent" />
              Direct GitHub Install
            </div>
            <p className="text-[0.7rem] text-hub-text-dim leading-relaxed">
              Install a skill directly from a GitHub repository.
            </p>
            <div className="space-y-2">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.7rem] font-bold text-hub-text-faint">github:</div>
                <Input 
                  value={githubInput}
                  onChange={(e) => setGithubInput(e.target.value)}
                  placeholder="owner/repo"
                  onKeyDown={(e) => e.key === "Enter" && handleGithubInstall()}
                  className="pl-14 h-9 bg-hub-surface-1 border-hub-border-strong text-hub-text text-sm"
                />
              </div>
              <Button 
                onClick={handleGithubInstall} 
                disabled={!!installing || !githubInput.trim()}
                className="w-full h-9 bg-hub-surface-1 border border-hub-border-strong text-hub-text hover:text-white hover:bg-hub-surface-2 transition-all"
              >
                {installing === `github:${githubInput}` ? <Loader2 className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
                Install from GitHub
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-hub-border bg-hub-surface-2/40">
             <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest mb-3">
              <Monitor className="size-4 text-hub-accent" />
              Local Status
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[0.75rem]">
                <span className="text-hub-text-dim">Installed</span>
                <span className="text-white font-bold">{installedSlugs.size}</span>
              </div>
              <div className="flex justify-between items-center text-[0.75rem]">
                <span className="text-hub-text-dim">Removable</span>
                <span className="text-white font-bold">{removableSlugs.size}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
