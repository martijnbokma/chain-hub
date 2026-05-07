import React, { useState, useEffect, useMemo } from "react"
import { useHub } from "@/lib/HubContext"
import { apiRequest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Plus, 
  Search, 
  RotateCcw, 
  ChevronRight,
  Filter,
  Eye,
  EyeOff,
  Shield,
  Zap,
  User,
  Package,
  Users,
  Terminal,
  HelpCircle,
  LayoutGrid,
  Clock,
  Layers
} from "lucide-react"
import { toast } from "sonner"
import { SkillDetail } from "./SkillDetail"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { NewSkillModal } from "./NewSkillModal"
import { ViewHeader } from "@/components/layout/ViewHeader"
import { ViewContainer } from "@/components/layout/ViewContainer"

export interface Skill {
  slug: string
  description?: string
  bucket: string
  isCore: boolean
  addedAt?: number
  githubOwner?: string
  credits?: string
  deactivated: boolean
}

interface SkillsData {
  skills: Skill[]
  initialized: boolean
}

const BUCKET_LABELS: Record<string, string> = {
  core: "Core",
  chain_hub: "Chain Hub",
  personal: "Personal",
  packs: "Packs",
  community: "Community",
  cli_packages: "CLI packages",
  unknown: "Unknown",
}

const BUCKET_ICONS: Record<string, any> = {
  all: Layers,
  core: Shield,
  chain_hub: Zap,
  personal: User,
  packs: Package,
  community: Users,
  cli_packages: Terminal,
  unknown: HelpCircle,
}

const BUCKET_ORDER = ["core", "chain_hub", "personal", "packs", "community", "cli_packages", "unknown"]

export function SkillsView() {
  const { refreshConfig } = useHub()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [recencyFilter, setRecencyFilter] = useState("all")
  const [sortMode, setSortMode] = useState("category")
  const [isNewSkillModalOpen, setIsNewSkillModalOpen] = useState(false)

  const fetchSkills = async () => {
    try {
      setLoading(true)
      const data = await apiRequest<SkillsData>("/api/skills")
      setSkills(data.skills)
      if (!data.initialized) {
        toast.info("Hub metadata is still initializing. Retry in a moment.")
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSkill = async (e: React.MouseEvent, skill: Skill) => {
    e.stopPropagation()
    try {
      const nextEnabled = skill.deactivated
      await apiRequest(`/api/skills/${encodeURIComponent(skill.slug)}/toggle`, {
        method: "POST",
        body: { enabled: nextEnabled }
      })
      toast.success(`${skill.slug} ${nextEnabled ? "geactiveerd" : "gedeactiveerd"}`)
      fetchSkills()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  useEffect(() => {
    fetchSkills()
  }, [])

  const filteredSkills = useMemo(() => {
    const now = Date.now()
    const recencyWindowMs =
      recencyFilter === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : recencyFilter === "30d"
          ? 30 * 24 * 60 * 60 * 1000
          : null

    const query = searchQuery.toLowerCase().trim()

    return skills.filter((skill) => {
      if (categoryFilter !== "all" && skill.bucket !== categoryFilter) {
        return false
      }
      if (recencyWindowMs !== null) {
        if (typeof skill.addedAt !== "number") return false
        if (now - skill.addedAt > recencyWindowMs) return false
      }
      if (query) {
        const nameMatch = skill.slug.toLowerCase().includes(query)
        const descMatch = (skill.description ?? "").toLowerCase().includes(query)
        if (!nameMatch && !descMatch) return false
      }
      return true
    })
  }, [skills, searchQuery, categoryFilter, recencyFilter])

  const sortedBuckets = useMemo(() => {
    if (sortMode === "newest") {
      const sorted = [...filteredSkills].sort((a, b) => {
        const aStamp = a.addedAt ?? 0
        const bStamp = b.addedAt ?? 0
        if (aStamp !== bStamp) return bStamp - aStamp
        return a.slug.localeCompare(b.slug)
      })
      return [{ id: "all", label: "All matching skills (newest first)", skills: sorted }]
    }

    const buckets: { id: string, label: string, skills: Skill[] }[] = []
    for (const bucket of BUCKET_ORDER) {
      const inBucket = filteredSkills
        .filter((s) => s.bucket === bucket)
        .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
      
      if (inBucket.length > 0) {
        buckets.push({
          id: bucket,
          label: BUCKET_LABELS[bucket] ?? bucket,
          skills: inBucket
        })
      }
    }
    return buckets
  }, [filteredSkills, sortMode])

  const resetFilters = () => {
    setSearchQuery("")
    setCategoryFilter("all")
    setRecencyFilter("all")
    setSortMode("category")
  }

  if (selectedSlug) {
    return (
      <SkillDetail 
        slug={selectedSlug} 
        onBack={() => {
          setSelectedSlug(null)
          fetchSkills()
        }} 
      />
    )
  }

  return (
    <div className="space-y-4">
      <ViewHeader 
        title="Skills" 
        description="Explore and manage your library of agent skills."
      >
        <Button 
          onClick={() => setIsNewSkillModalOpen(true)}
          className="bg-hub-accent hover:bg-hub-accent/90 text-white h-10 px-6 gap-2 shadow-lg shadow-hub-accent/20 hover:scale-[1.02] transition-all font-semibold"
        >
          <Plus className="size-4" />
          New Skill
        </Button>
      </ViewHeader>

      <ViewContainer className="flex flex-wrap items-center gap-4 p-4 animate-in fade-in slide-in-from-top-2 duration-500 delay-100 fill-mode-both">
        <div className="flex flex-col gap-1.5 flex-[2] min-w-[240px]">
          <div className="flex items-center gap-1.5 px-0.5">
            <Search className="size-3 text-hub-text-faint" />
            <label className="text-[0.6rem] tracking-widest text-hub-text-faint uppercase font-bold">Search Skills</label>
          </div>
          <div className="relative group/search">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-hub-text-faint group-focus-within/search:text-hub-accent transition-colors" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name..."
              className="pl-10 h-10 bg-hub-surface-2/40 border-hub-border-strong/20 text-hub-text focus:border-hub-accent/40 transition-all rounded-xl placeholder:text-hub-text-faint/50"
            />
          </div>
        </div>

        <div className="flex flex-1 gap-4 min-w-[300px]">
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex items-center gap-1.5 px-0.5">
              <Filter className="size-3 text-hub-text-faint" />
              <label className="text-[0.6rem] tracking-widest text-hub-text-faint uppercase font-bold">Category</label>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-hub-surface-2/40 border-hub-border-strong/20">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-2xl">
                <SelectItem value="all">
                  <div className="flex items-center gap-2.5">
                    <Layers className="size-3.5 text-hub-text-faint" />
                    <span>All categories</span>
                  </div>
                </SelectItem>
                {BUCKET_ORDER.map(b => {
                  const Icon = BUCKET_ICONS[b] || HelpCircle
                  return (
                    <SelectItem key={b} value={b}>
                      <div className="flex items-center gap-2.5">
                        <Icon className="size-3.5 text-hub-text-faint" />
                        <span>{BUCKET_LABELS[b] || b}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex items-center gap-1.5 px-0.5">
              <LayoutGrid className="size-3 text-hub-text-faint" />
              <label className="text-[0.6rem] tracking-widest text-hub-text-faint uppercase font-bold">Sorting</label>
            </div>
            <Select value={sortMode} onValueChange={setSortMode}>
              <SelectTrigger className="bg-hub-surface-2/40 border-hub-border-strong/20">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-2xl">
                <SelectItem value="category">
                  <div className="flex items-center gap-2.5">
                    <LayoutGrid className="size-3.5 text-hub-text-faint" />
                    <span>By category</span>
                  </div>
                </SelectItem>
                <SelectItem value="newest">
                  <div className="flex items-center gap-2.5">
                    <Clock className="size-3.5 text-hub-text-faint" />
                    <span>Newest first</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 pt-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters}
            className="h-10 px-4 text-hub-text-dim hover:text-white hover:bg-white/5 rounded-xl transition-all disabled:opacity-0"
            disabled={searchQuery === "" && categoryFilter === "all" && sortMode === "category"}
          >
            <RotateCcw className="size-3.5 mr-2" />
            Reset
          </Button>
        </div>
      </ViewContainer>

      <div className="space-y-10">
        {sortedBuckets.map((bucket, bucketIdx) => (
          <section key={bucket.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" style={{ animationDelay: `${bucketIdx * 100 + 200}ms` }}>
            <h2 className="text-[0.68rem] tracking-[0.2em] text-hub-text-faint uppercase font-bold px-1 flex items-center gap-3">
              {bucket.label}
              <Badge variant="outline" className="h-4 px-1.5 text-[0.6rem] border-hub-border text-hub-text-faint bg-white/5 font-bold">
                {bucket.skills.length}
              </Badge>
              <div className="h-px flex-1 bg-gradient-to-r from-hub-border to-transparent" />
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bucket.skills.map((skill) => (
                <div 
                  key={skill.slug} 
                  className="group relative"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSlug(skill.slug)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setSelectedSlug(skill.slug)
                    }
                  }}
                >
                  <div
                    className={`w-full text-left flex flex-col p-4 rounded-xl border transition-all duration-300 ease-out overflow-hidden ring-1 ring-white/5 ${
                      skill.deactivated 
                        ? "bg-hub-surface-1/20 border-hub-border opacity-50 grayscale-[0.5] cursor-not-allowed" 
                        : "bg-hub-surface-1/40 border-hub-border hover:bg-hub-surface-2/80 hover:border-hub-accent/40 hover:shadow-xl hover:shadow-hub-accent/5 hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`size-2.5 rounded-full ring-2 ring-white/5 transition-all duration-500 ${
                        skill.deactivated 
                          ? "bg-hub-text-faint/50 grayscale shadow-none" 
                          : (skill.isCore 
                              ? "bg-hub-core shadow-[0_0_10px_rgba(139,124,255,0.5)] animate-hub-status-glow" 
                              : "bg-hub-user shadow-[0_0_10px_rgba(78,224,161,0.5)] animate-hub-status-glow")
                      }`} />
                      
                      <div className="flex items-center gap-2">
                        {skill.deactivated && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[0.6rem] border-hub-err/30 text-hub-err/70 bg-hub-err/5 uppercase tracking-wider font-bold">
                            Deactivated
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={`text-[0.6rem] h-4 uppercase tracking-wider font-bold border-0 rounded-full px-1.5 ${
                            (skill.isCore || skill.bucket === "chain_hub")
                              ? "bg-hub-accent/10 text-hub-accent ring-1 ring-hub-accent/30" 
                              : skill.bucket === "community"
                                ? "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30"
                                : skill.bucket === "personal"
                                  ? "bg-hub-user/10 text-hub-user ring-1 ring-hub-user/30"
                                  : "bg-white/5 text-hub-text-faint ring-1 ring-white/10"
                          }`}
                        >
                          {skill.bucket}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 mb-4">
                      <span className="block font-bold text-[0.95rem] text-[#f2f6ff] group-hover:text-white truncate tracking-tight">
                        {skill.slug}
                      </span>
                      {skill.githubOwner && (
                        <div className="text-[0.6rem] text-hub-accent/70 uppercase font-bold tracking-widest mt-0.5">
                          {skill.githubOwner}
                        </div>
                      )}
                        {skill.credits && (
                          <div className="text-[0.6rem] text-hub-text-faint/50 mt-0.5 line-clamp-1">
                            {skill.credits.includes(" — ") ? (
                              <a 
                                href={skill.credits.split(" — ")[1]} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-hub-accent hover:underline transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {skill.credits.split(" — ")[0]}
                              </a>
                            ) : (
                              skill.credits
                            )}
                          </div>
                        )}
                      <div className="text-[0.75rem] text-hub-text-dim line-clamp-2 mt-1 leading-relaxed">
                        {skill.description || "No description provided."}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-hub-border/50">
                      <div className="flex items-center gap-1.5 text-[0.65rem] text-hub-text-faint group-hover:text-hub-accent transition-colors font-semibold uppercase tracking-wider">
                        View Details
                        <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </div>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-hub-text-faint hover:text-white hover:bg-hub-surface-3 rounded-lg bg-white/5 border border-transparent hover:border-hub-border/50 transition-all"
                                onClick={(e) => handleToggleSkill(e, skill)}
                              >
                                {skill.deactivated ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                              </Button>
                            }
                          />
                          <TooltipContent>
                            {skill.deactivated ? "Inschakelen" : "Uitschakelen"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {filteredSkills.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-hub-border rounded-xl bg-hub-surface-1/20 animate-in fade-in zoom-in-95 duration-500">
            <Search className="size-8 text-hub-text-faint mb-4 opacity-20" />
            <h3 className="text-hub-text font-bold text-sm mb-1">No skills found</h3>
            <p className="text-hub-text-faint text-[0.75rem] max-w-[240px] leading-relaxed">
              We couldn't find any skills matching your search criteria. Try a different query or category.
            </p>
            <Button variant="link" onClick={resetFilters} className="mt-2 text-hub-accent hover:text-hub-accent/80 text-xs">
              Clear all filters
            </Button>
          </div>
        )}
      </div>

      <NewSkillModal 
        open={isNewSkillModalOpen} 
        onOpenChange={setIsNewSkillModalOpen}
        onSuccess={(slug) => {
          setSelectedSlug(slug)
          fetchSkills()
        }}
      />
    </div>
  )
}
