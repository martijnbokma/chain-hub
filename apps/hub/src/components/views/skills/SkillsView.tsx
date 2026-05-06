import { useState, useEffect, useMemo } from "react"
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
  Filter
} from "lucide-react"
import { toast } from "sonner"
import { SkillDetail } from "./SkillDetail"
import { Badge } from "@/components/ui/badge"
import { NewSkillModal } from "./NewSkillModal"

export interface Skill {
  slug: string
  description?: string
  bucket: string
  isCore: boolean
  addedAt?: number
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
      <header className="flex items-center justify-between gap-4 mb-4">
        <h1 className="m-0 font-hub-display text-[1.05rem] tracking-wide text-[#f5f8ff]">Skills</h1>
        <Button 
          onClick={() => setIsNewSkillModalOpen(true)}
          className="bg-hub-accent hover:bg-hub-accent/90 text-white h-9 gap-2"
        >
          <Plus className="size-4" />
          New skill
        </Button>
      </header>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="flex flex-col gap-1.5 flex-[2] min-w-[240px]">
          <label className="text-[0.66rem] tracking-wide text-hub-text-faint uppercase font-semibold">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-hub-text-faint" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or description..."
              className="pl-9 h-9 bg-hub-surface-2 border-hub-border-strong text-hub-text"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-[0.66rem] tracking-wide text-hub-text-faint uppercase font-semibold">Category</label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 bg-hub-surface-2 border-hub-border-strong text-hub-text">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-hub-surface-2 border-hub-border text-hub-text">
              <SelectItem value="all">All categories</SelectItem>
              {BUCKET_ORDER.map(b => (
                <SelectItem key={b} value={b}>{BUCKET_LABELS[b] || b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-[0.66rem] tracking-wide text-hub-text-faint uppercase font-semibold">Sorting</label>
          <Select value={sortMode} onValueChange={setSortMode}>
            <SelectTrigger className="h-9 bg-hub-surface-2 border-hub-border-strong text-hub-text">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-hub-surface-2 border-hub-border text-hub-text">
              <SelectItem value="category">Badge/category</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetFilters}
          className="h-9 border-hub-border bg-hub-surface-2 text-hub-text-dim hover:text-hub-text disabled:opacity-50"
          disabled={searchQuery === "" && categoryFilter === "all" && sortMode === "category"}
        >
          <RotateCcw className="size-3.5 mr-2" />
          Reset
        </Button>
      </div>

      <div className="space-y-6">
        {sortedBuckets.map((bucket) => (
          <section key={bucket.id} className="space-y-2">
            <h2 className="text-[0.68rem] tracking-wider text-hub-text-faint uppercase font-bold px-1 flex items-center gap-2">
              {bucket.label}
              <Badge variant="outline" className="h-4 px-1 text-[0.6rem] border-hub-border text-hub-text-faint">
                {bucket.skills.length}
              </Badge>
            </h2>
            <div className="space-y-2">
              {bucket.skills.map((skill) => (
                <button
                  key={skill.slug}
                  onClick={() => setSelectedSlug(skill.slug)}
                  className="w-full text-left group flex gap-4 p-3 rounded-md border border-hub-border bg-hub-surface-1/50 hover:bg-hub-surface-2/80 hover:border-hub-border-strong transition-all duration-150"
                >
                  <div className="mt-1.5 shrink-0">
                    <div className={`size-2 rounded-full ${skill.isCore ? "bg-hub-core" : "bg-hub-user"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[#f2f6ff] group-hover:text-white">{skill.slug}</div>
                    <div className="text-[0.77rem] text-hub-text-dim line-clamp-2 mt-0.5">{skill.description}</div>
                  </div>
                  <div className="shrink-0 self-center">
                    <Badge variant="outline" className="text-[0.65rem] border-hub-border-strong text-hub-text-faint">
                      {skill.bucket}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}

        {filteredSkills.length === 0 && (
          <div className="p-8 text-center border border-dashed border-hub-border rounded-lg text-hub-text-dim text-sm">
            No skills found matching your search.
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
