import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Trash2, CheckCircle2, Loader2, User } from "lucide-react"

export interface RegistrySkill {
  slug: string
  description?: string
  source: string
  version: string
  githubOwner?: string
  credits?: string
  inRegistry?: boolean
  isLocalOnly?: boolean
}

export interface RegistrySkillCardProps {
  skill: RegistrySkill
  isInstalled: boolean
  canUninstall: boolean
  isActionLoading: boolean
  installing: string | null
  onInstall: (slug: string) => void
  onConfirmUninstall: (slug: string) => void
}

export function RegistrySkillCard({
  skill,
  isInstalled,
  canUninstall,
  isActionLoading,
  installing,
  onInstall,
  onConfirmUninstall,
}: RegistrySkillCardProps) {
  return (
    <div className="flex flex-col p-5 rounded-xl border border-hub-border bg-hub-surface-1/40 hover:bg-hub-surface-2/80 hover:border-hub-accent/30 transition-all duration-300 group shadow-lg ring-1 ring-white/5">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-white text-[0.95rem] tracking-tight truncate">{skill.slug}</span>
            <Badge variant="outline" className="text-[0.6rem] h-4 border-hub-border-strong/40 text-hub-text-faint px-1.5 bg-white/5">
              {skill.version}
            </Badge>
          </div>
          <div className="text-[0.65rem] text-hub-text-faint uppercase font-bold tracking-widest">
            {skill.githubOwner ? (
              <span className="text-hub-accent/70 flex items-center gap-1.5">
                <User className="size-2.5" />
                {skill.githubOwner}
              </span>
            ) : (
              skill.source
            )}
          </div>
          {skill.credits && (
            <div className="text-[0.6rem] text-hub-text-faint/50 mt-0.5 line-clamp-1">
              {skill.credits.includes(" — ") ? (
                <>
                  {skill.credits.split(" — ")[0]} •{" "}
                  <a
                    href={skill.credits.split(" — ")[1]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-hub-accent/60 hover:text-hub-accent hover:underline transition-colors"
                  >
                    GitHub
                  </a>
                </>
              ) : (
                skill.credits
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 ml-4">
          {isInstalled ? (
            canUninstall ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConfirmUninstall(skill.slug)}
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
              onClick={() => onInstall(skill.slug)}
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
}
