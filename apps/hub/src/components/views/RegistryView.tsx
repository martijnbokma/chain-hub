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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

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
  const [isUninstallConfirmOpen, setIsUninstallConfirmOpen] = useState(false)
  const [slugToUninstall, setSlugToUninstall] = useState<string | null>(null)

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

    // Add local skills that might not be in the registry index
    // This ensures user-installed or personal skills show up
    installedSlugs.forEach(slug => {
      if (!bySlug.has(slug)) {
        // Try to find description from local list
        const local = (allSkills as any).find?.((s: any) => s.slug === slug) 
        bySlug.set(slug, {
          slug,
          description: local?.description || "Locally installed skill",
          source: "local",
          version: "unknown",
          inRegistry: false,
          isLocalOnly: true
        })
      }
    })

    return Array.from(bySlug.values()).sort((a, b) => a.slug.localeCompare(b.slug))
  }, [allSkills, installedSlugs])

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
        body: { slug }
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
    try {
      setInstalling(slug)
      await apiRequest(`/api/skills/${encodeURIComponent(slug)}`, { method: "DELETE" })
      toast.success(`Uninstalled ${slug}`)
      await loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setInstalling(null)
      setSlugToUninstall(null)
    }
  }

  const confirmUninstall = (slug: string) => {
    setSlugToUninstall(slug)
    setIsUninstallConfirmOpen(true)
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
      <header className="flex items-center justify-between gap-4 mb-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex flex-col">
          <h1 className="m-0 font-hub-display text-2xl font-bold tracking-tight text-white leading-none">Registry</h1>
          <p className="text-[0.7rem] text-hub-text-dim uppercase tracking-[0.2em] mt-2 font-bold flex items-center gap-2">
            Registry Source <span className="h-1 w-1 rounded-full bg-hub-accent animate-pulse" /> <span className="text-hub-accent">{source}</span>
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-500 delay-100 fill-mode-both">
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
            className={`h-9 px-4 gap-2 border-hub-border-strong/20 transition-all ${
              filter === btn.id 
                ? "bg-hub-accent text-white shadow-lg shadow-hub-accent/20" 
                : "bg-hub-surface-2/40 text-hub-text-dim hover:text-white hover:bg-hub-surface-3"
            }`}
          >
            <btn.icon className="size-3.5" />
            {btn.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
          <div className="relative group/search">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-hub-text-faint group-focus-within/search:text-hub-accent transition-colors" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search registry by name or description..."
              className="pl-11 h-11 bg-hub-surface-2 border-hub-border-strong/40 text-hub-text focus:border-hub-accent/50 transition-all rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full p-20 flex flex-col items-center justify-center text-hub-text-dim">
                <Loader2 className="size-10 animate-spin text-hub-accent/40 mb-4" />
                <span className="text-sm font-medium tracking-wide uppercase">Refreshing Registry...</span>
              </div>
            ) : filteredSkills.length === 0 ? (
              <div className="col-span-full p-12 text-center border border-dashed border-hub-border rounded-xl bg-hub-surface-1/20 text-hub-text-dim text-sm">
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
                    className="flex flex-col p-5 rounded-xl border border-hub-border bg-hub-surface-1/40 hover:bg-hub-surface-2/80 hover:border-hub-accent/30 transition-all duration-300 group shadow-lg ring-1 ring-white/5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white text-[0.95rem] tracking-tight truncate">{skill.slug}</span>
                          <Badge variant="outline" className="text-[0.6rem] h-4 border-hub-border-strong/40 text-hub-text-faint px-1.5 bg-white/5">
                            {skill.version}
                          </Badge>
                        </div>
                        <div className="text-[0.65rem] text-hub-text-faint uppercase font-bold tracking-widest">
                          {skill.source}
                        </div>
                      </div>
                      
                      <div className="shrink-0 ml-4">
                        {isInstalled ? (
                          canUninstall ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => confirmUninstall(skill.slug)}
                              disabled={!!installing}
                              className="h-8 px-3 border-hub-err/20 text-hub-err/60 hover:bg-hub-err/10 hover:text-hub-err hover:border-hub-err/40 transition-all"
                            >
                              {isActionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5 mr-1.5" />}
                              Uninstall
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-hub-success/10 border border-hub-success/20 text-hub-success text-[0.65rem] font-bold uppercase tracking-wider">
                              <CheckCircle2 className="size-3" />
                              Active
                            </div>
                          )
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => handleInstall(skill.slug)}
                            disabled={!!installing}
                            className="h-8 px-4 bg-hub-accent hover:bg-hub-accent/90 text-white shadow-md shadow-hub-accent/10"
                          >
                            {isActionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5 mr-1.5" />}
                            Install
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-[0.75rem] text-hub-text-dim line-clamp-3 leading-relaxed mt-auto min-h-[3rem]">
                      {skill.description || "Explore this skill's capabilities."}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700 delay-300 fill-mode-both">
          <div className="p-6 rounded-2xl border border-hub-border bg-hub-surface-1/40 backdrop-blur-md shadow-2xl ring-1 ring-white/5 space-y-6">
            <div className="flex items-center gap-3 text-white text-xs font-bold uppercase tracking-[0.2em]">
              <div className="size-8 rounded-lg bg-hub-accent/10 flex items-center justify-center">
                <GitBranch className="size-4 text-hub-accent" />
              </div>
              Direct GitHub
            </div>
            
            <p className="text-[0.75rem] text-hub-text-dim leading-relaxed">
              Install any skill directly from a GitHub repository by providing the owner and repo name.
            </p>

            <div className="space-y-3">
              <div className="relative group/gh">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.7rem] font-bold text-hub-text-faint group-focus-within/gh:text-hub-accent transition-colors">github:</div>
                <Input 
                  value={githubInput}
                  onChange={(e) => setGithubInput(e.target.value)}
                  placeholder="owner/repo"
                  onKeyDown={(e) => e.key === "Enter" && handleGithubInstall()}
                  className="pl-14 h-10 bg-hub-surface-2 border-hub-border-strong/40 text-hub-text text-sm focus:border-hub-accent/50 transition-all rounded-lg"
                />
              </div>
              <Button 
                onClick={handleGithubInstall} 
                disabled={!!installing || !githubInput.trim()}
                className="w-full h-10 bg-hub-surface-3/50 border border-hub-border text-hub-text hover:text-white hover:bg-hub-accent hover:border-hub-accent hover:shadow-lg hover:shadow-hub-accent/20 transition-all font-semibold rounded-lg"
              >
                {installing === `github:${githubInput}` ? <Loader2 className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
                Add Repository
              </Button>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-hub-border bg-hub-surface-1/40 backdrop-blur-sm ring-1 ring-white/5 shadow-xl">
             <div className="flex items-center gap-3 text-white text-xs font-bold uppercase tracking-[0.2em] mb-5">
               <div className="size-8 rounded-lg bg-hub-user/10 flex items-center justify-center">
                <Monitor className="size-4 text-hub-user" />
              </div>
              Local Status
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center group/stat">
                <span className="text-[0.7rem] text-hub-text-dim uppercase font-bold tracking-wider group-hover:text-hub-text transition-colors">Installed</span>
                <span className="text-sm text-white font-bold px-2 py-0.5 rounded bg-white/5 border border-hub-border">{installedSlugs.size}</span>
              </div>
              <div className="flex justify-between items-center group/stat">
                <span className="text-[0.7rem] text-hub-text-dim uppercase font-bold tracking-wider group-hover:text-hub-text transition-colors">Removable</span>
                <span className="text-sm text-white font-bold px-2 py-0.5 rounded bg-white/5 border border-hub-border">{removableSlugs.size}</span>
              </div>
              <div className="h-px bg-hub-border/50 my-2" />
              <p className="text-[0.65rem] text-hub-text-faint italic leading-relaxed">
                Core skills cannot be removed as they are part of the base hub distribution.
              </p>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={isUninstallConfirmOpen}
        onOpenChange={setIsUninstallConfirmOpen}
        onConfirm={() => slugToUninstall && handleUninstall(slugToUninstall)}
        title="Uninstall Skill?"
        description={`Are you sure you want to uninstall "${slugToUninstall}"? This will remove the skill from your local hub.`}
        confirmText="Uninstall"
        variant="destructive"
        isLoading={!!installing}
      />
    </div>
  )
}
