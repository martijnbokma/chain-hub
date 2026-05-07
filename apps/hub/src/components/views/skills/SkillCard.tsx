import { Badge } from "@/components/ui/badge"
import { ExternalLink, Eye, EyeOff, Package } from "lucide-react"

export interface Skill {
  slug: string
  deactivated: boolean
  isCore: boolean
  bucket: "core" | "chain_hub" | "personal" | "community" | "unknown"
  githubOwner?: string
  credits?: string
}

export interface SkillCardProps {
  skill: Skill
  viewMode: "grid" | "list"
  onClick: () => void
}

export function SkillCard({ skill, viewMode, onClick }: SkillCardProps) {
  const isGrid = viewMode === "grid"

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer transition-all duration-300 relative ${
        isGrid
          ? "p-5 rounded-xl border border-hub-border/50 hover:border-hub-accent/40 bg-hub-surface-1/30 hover:bg-hub-surface-2/40 overflow-hidden flex flex-col h-full shadow-sm hover:shadow-xl hover:shadow-hub-accent/5 hover:-translate-y-1"
          : "p-3 px-4 rounded-lg border border-hub-border/40 hover:border-hub-accent/40 bg-hub-surface-1/30 hover:bg-hub-surface-2/40 flex items-center gap-4"
      } ${skill.deactivated ? "opacity-60 grayscale-[0.5]" : ""}`}
    >
      {/* Background accent glow */}
      <div className="absolute -right-12 -top-12 size-24 bg-hub-accent/5 rounded-full blur-3xl group-hover:bg-hub-accent/10 transition-all duration-500" />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`size-1.5 rounded-full ${
              skill.deactivated
                ? "bg-hub-text-faint"
                : (skill.isCore
                    ? "bg-hub-core shadow-[0_0_8px_rgba(139,124,255,0.4)]"
                    : "bg-hub-user shadow-[0_0_8px_rgba(78,224,161,0.4)]")
            }`} />
            <h3 className="font-hub-display font-bold text-hub-text group-hover:text-hub-accent transition-colors truncate">
              {skill.slug}
            </h3>
          </div>

          {(skill.githubOwner || skill.credits) && isGrid && (
            <div className="text-[0.65rem] text-hub-text-faint flex items-center gap-1.5 mt-1">
              {skill.githubOwner && (
                <span className="flex items-center gap-1">
                  <Package className="size-3 opacity-50" />
                  {skill.githubOwner}
                </span>
              )}
              {skill.githubOwner && skill.credits && <span className="opacity-20">•</span>}
              {skill.credits && (
                <span className="truncate max-w-[120px]">
                  {skill.credits.split(" — ")[0]}
                </span>
              )}
            </div>
          )}
        </div>

        {isGrid && (
          <div className="flex items-center gap-1 self-start">
            <Badge
              variant="outline"
              className={`px-1.5 py-0 text-[0.6rem] font-bold uppercase tracking-wider border-0 rounded-md shrink-0 ${
                skill.isCore
                  ? "bg-hub-core/10 text-hub-core"
                  : "bg-hub-user/10 text-hub-user"
              }`}
            >
              {skill.isCore ? "Core" : "User"}
            </Badge>
          </div>
        )}
      </div>

      {isGrid && (
        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[0.65rem] font-medium text-hub-text-faint">
            {skill.deactivated ? (
              <span className="flex items-center gap-1 text-hub-err/70">
                <EyeOff className="size-3" /> Deactive
              </span>
            ) : (
              <span className="flex items-center gap-1 text-hub-success/70">
                <Eye className="size-3" /> Active
              </span>
            )}
          </div>
          <div className="size-6 rounded-full bg-hub-surface-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <ExternalLink className="size-3 text-hub-accent" />
          </div>
        </div>
      )}

      {!isGrid && (
        <div className="ml-auto flex items-center gap-4">
          <Badge
            variant="outline"
            className={`px-1.5 text-[0.6rem] font-bold uppercase tracking-wider border-0 rounded-md shrink-0 hidden md:block ${
              skill.isCore
                ? "bg-hub-core/10 text-hub-core"
                : "bg-hub-user/10 text-hub-user"
            }`}
          >
            {skill.isCore ? "Core" : "User"}
          </Badge>
          <ExternalLink className="size-4 text-hub-text-faint group-hover:text-hub-accent transition-colors" />
        </div>
      )}
    </div>
  )
}
