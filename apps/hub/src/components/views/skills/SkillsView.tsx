import { useState, useEffect } from "react"
import { apiRequest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Search,
  Filter,
  Plus,
  Grid,
  List as ListIcon,
  Package,
  User,
  ShieldCheck,
  Globe,
  Loader2
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { SkillDetail } from "./SkillDetail"
import { SkillCard, type Skill } from "./SkillCard"
import { toast } from "sonner"
import { useHub } from "@/lib/HubContext"
import { ViewHeader } from "@/components/layout/ViewHeader"
import { ViewContainer } from "@/components/layout/ViewContainer"

interface BucketGroup {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  skills: Skill[]
}

function useSkillsFilter(
  skills: Skill[],
  search: string,
  filterBucket: string,
): { filteredSkills: Skill[]; groupedBuckets: BucketGroup[] } {
  const filteredSkills = skills.filter((s) => {
    const matchesSearch = s.slug.toLowerCase().includes(search.toLowerCase())
    const matchesBucket = filterBucket === "all" || s.bucket === filterBucket
    return matchesSearch && matchesBucket
  })

  const groupedBuckets: BucketGroup[] = [
    { id: "core",      title: "Protected Core",     icon: ShieldCheck, skills: filteredSkills.filter((s) => s.isCore) },
    { id: "chain_hub", title: "Chain Hub Registry", icon: Package,     skills: filteredSkills.filter((s) => !s.isCore && s.bucket === "chain_hub") },
    { id: "personal",  title: "Personal Skills",    icon: User,        skills: filteredSkills.filter((s) => s.bucket === "personal") },
    { id: "community", title: "Community",          icon: Globe,       skills: filteredSkills.filter((s) => s.bucket === "community") },
    { id: "unknown",   title: "Other",              icon: Package,     skills: filteredSkills.filter((s) => s.bucket === "unknown") },
  ].filter((b) => b.skills.length > 0)

  return { filteredSkills, groupedBuckets }
}

export function SkillsView() {
  const { uiPrefs, updateUiPrefs: setUiPrefs } = useHub()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterBucket, setFilterBucket] = useState<string>("all")
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)

  useEffect(() => {
    fetchSkills()
  }, [])

  const fetchSkills = async () => {
    try {
      setLoading(true)
      const data = await apiRequest<Skill[]>("/api/skills")
      setSkills(data)
    } catch (err: unknown) {
      toast.error(`Failed to load skills: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const { filteredSkills, groupedBuckets } = useSkillsFilter(skills, search, filterBucket)

  if (selectedSkill) {
    return <SkillDetail slug={selectedSkill} onBack={() => { setSelectedSkill(null); fetchSkills(); }} />
  }

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Skills"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-hub-surface-2 rounded-lg p-1 border border-hub-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setUiPrefs({ skillsViewMode: "grid" })}
                className={`size-7 rounded-md transition-all ${uiPrefs.skillsViewMode === "grid" ? "bg-hub-accent text-white shadow-sm" : "text-hub-text-faint hover:text-hub-text"}`}
              >
                <Grid className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setUiPrefs({ skillsViewMode: "list" })}
                className={`size-7 rounded-md transition-all ${uiPrefs.skillsViewMode === "list" ? "bg-hub-accent text-white shadow-sm" : "text-hub-text-faint hover:text-hub-text"}`}
              >
                <ListIcon className="size-3.5" />
              </Button>
            </div>
            <Button size="sm" className="bg-hub-accent hover:bg-hub-accent/90 text-white font-semibold shadow-lg shadow-hub-accent/20">
              <Plus className="size-4 mr-1.5" />
              Create Skill
            </Button>
          </div>
        }
      />

      <ViewContainer className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-hub-text-faint" />
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-hub-surface-2/50 border-hub-border/50 focus:border-hub-accent/50 focus:ring-hub-accent/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select value={filterBucket} onValueChange={setFilterBucket}>
              <SelectTrigger className="w-full sm:w-[180px] bg-hub-surface-2/50 border-hub-border/50">
                <div className="flex items-center gap-2">
                  <Filter className="size-3.5 text-hub-text-faint" />
                  <SelectValue placeholder="All Buckets" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-hub-surface-2 border-hub-border text-hub-text">
                <SelectItem value="all">All Buckets</SelectItem>
                <SelectItem value="core">Core Assets</SelectItem>
                <SelectItem value="chain_hub">Chain Hub Registry</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="community">Community</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ViewContainer>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-in fade-in duration-700">
          <Loader2 className="size-8 text-hub-accent animate-spin" />
          <p className="text-hub-text-faint font-medium">Fetching skills registry...</p>
        </div>
      ) : filteredSkills.length === 0 ? (
        <ViewContainer className="flex flex-col items-center justify-center h-64 border-dashed">
          <Package className="size-12 text-hub-text-faint mb-4 opacity-20" />
          <p className="text-hub-text-dim font-medium">Geen skills gevonden die voldoen aan je zoekopdracht.</p>
          <Button variant="link" onClick={() => { setSearch(""); setFilterBucket("all"); }} className="text-hub-accent mt-2">
            Reset filters
          </Button>
        </ViewContainer>
      ) : (
        <div className="space-y-10 pb-12">
          {groupedBuckets.map((bucket, bucketIdx) => (
            <section
              key={bucket.id}
              className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
              style={{ animationDelay: `${bucketIdx * 100 + 100}ms` }}
            >
              <div className="flex items-center gap-3 px-1">
                <div className="p-1.5 rounded-lg bg-hub-surface-2 border border-hub-border">
                  <bucket.icon className="size-4 text-hub-accent" />
                </div>
                <h2 className="font-hub-display font-bold text-white tracking-wide text-sm uppercase flex items-center gap-2">
                  {bucket.title}
                  <span className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded-full bg-white/5 text-hub-text-faint border border-white/10 ml-1">
                    {bucket.skills.length}
                  </span>
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-hub-border to-transparent" />
              </div>

              <div className={uiPrefs.skillsViewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                : "flex flex-col gap-2"
              }>
                {bucket.skills.map((skill) => (
                  <SkillCard
                    key={skill.slug}
                    skill={skill}
                    viewMode={uiPrefs.skillsViewMode}
                    onClick={() => setSelectedSkill(skill.slug)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
