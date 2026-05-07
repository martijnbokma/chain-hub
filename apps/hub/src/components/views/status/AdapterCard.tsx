import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from "lucide-react"

interface LinkStatus {
  description: string
  status: "ok" | "warning" | "error"
  resolvedPath?: string
}

interface Adapter {
  name: string
  detected: boolean
  infoUrl?: string
  links?: LinkStatus[]
}

interface AdapterCardProps {
  adapter: Adapter
  setupInProgress: boolean
  onRepair: (adapterName: string) => void
}

export function AdapterCard({ adapter, setupInProgress, onRepair }: AdapterCardProps) {
  const issueCount = adapter.links?.filter((l) => l.status !== "ok").length ?? 0

  return (
    <Card className="overflow-hidden border-hub-border bg-hub-surface-1/85 shadow-none rounded-md">
      <div className="flex items-center justify-between gap-3 border-b border-hub-border px-3 py-2.5">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-semibold text-sm text-hub-text">{adapter.name}</span>
          {adapter.infoUrl && (
            <>
              <span className="text-hub-text-faint">·</span>
              <a
                href={adapter.infoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.72rem] text-hub-text-faint hover:text-hub-user underline underline-offset-2 flex items-center gap-1"
              >
                {new URL(adapter.infoUrl).hostname.replace(/^www\./, "")}
                <ExternalLink className="size-2.5" />
              </a>
            </>
          )}
        </div>
        <div>
          {!adapter.detected ? (
            <Badge
              variant="outline"
              className="border-hub-warn/40 text-hub-warn text-[0.65rem] uppercase py-0 px-1.5 h-5 font-semibold"
            >
              not detected
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={`text-[0.65rem] uppercase py-0 px-1.5 h-5 font-semibold ${
                issueCount === 0
                  ? "border-hub-user/40 text-hub-user"
                  : "border-hub-err/40 text-hub-err"
              }`}
            >
              {issueCount === 0 ? "healthy" : `${issueCount} issue(s)`}
            </Badge>
          )}
        </div>
      </div>

      {adapter.detected && adapter.links && (
        <div className="divide-y divide-hub-border/50">
          {adapter.links.map((link, idx) => (
            <div key={idx} className="flex items-start gap-3 px-3 py-2 pl-5 text-[0.75rem]">
              <div className="mt-0.5">
                {link.status === "ok" ? (
                  <CheckCircle2 className="size-3.5 text-hub-user" />
                ) : (
                  <AlertCircle
                    className={`size-3.5 ${link.status === "error" ? "text-hub-err" : "text-hub-warn"}`}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-hub-text">{link.description}</div>
                {link.resolvedPath && (
                  <div className="text-[0.68rem] text-hub-text-faint truncate font-hub-mono mt-0.5">
                    → {link.resolvedPath}
                  </div>
                )}
              </div>
            </div>
          ))}

          {adapter.links.some((l) => l.status !== "ok") && (
            <div className="px-3 py-2 bg-hub-surface-2/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRepair(adapter.name)}
                disabled={setupInProgress}
                className="h-7 text-[0.7rem] gap-1.5 border-hub-warn/55 text-hub-warn hover:bg-hub-warn/10"
              >
                {setupInProgress ? (
                  <>
                    <RefreshCw className="size-3 animate-spin" />
                    Running…
                  </>
                ) : (
                  `Repair ${adapter.name} links`
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
