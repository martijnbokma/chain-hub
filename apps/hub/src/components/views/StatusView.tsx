import { useState, useEffect } from "react"
import { apiRequest } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Wrench,
  PackageCheck,
  Link2,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

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

interface StatusData {
  chainHome: string
  source: string
  initialized: boolean
  adapters: Adapter[]
}

/** Matches SetupServiceResult from setup-service.ts */
interface MaintenanceLog {
  maintenance: {
    coreAssetsUpdated: boolean
    userRegistryEnsured: boolean
    redundantGeminiSymlinkRemoved: boolean
    repoHook: "skipped" | string
  }
  results: Array<{
    adapterName: string
    links: Array<{
      description: string
      result: string
      error?: string
    }>
  }>
}

function MaintenanceReport({ log }: { log: MaintenanceLog }) {
  const [open, setOpen] = useState(true)

  const totalLinks = log.results.reduce((s, r) => s + r.links.length, 0)
  const failedLinks = log.results.reduce(
    (s, r) => s + r.links.filter((l) => l.error || l.result === "failed").length,
    0,
  )

  return (
    <div className="rounded-md border border-hub-border bg-hub-surface-1/60 overflow-hidden">
      {/* header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-hub-surface-2/40 transition-colors"
      >
        <div className="flex items-center gap-2 text-[0.78rem] font-semibold text-hub-text">
          <Wrench className="size-3.5 text-hub-text-dim" />
          Maintenance report
          <span className="text-hub-text-faint font-normal">
            — {totalLinks} link{totalLinks !== 1 ? "s" : ""} processed
            {failedLinks > 0 ? `, ${failedLinks} failed` : ", all succeeded"}
          </span>
        </div>
        {open ? (
          <ChevronDown className="size-3.5 text-hub-text-faint shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 text-hub-text-faint shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-hub-border divide-y divide-hub-border/50">
          {/* Core assets & registry */}
          <div className="px-3 py-2.5 space-y-1.5">
            <div className="text-[0.68rem] uppercase tracking-wider text-hub-text-faint mb-2 font-semibold">
              Hub assets
            </div>
            <LogRow
              icon={<PackageCheck className="size-3.5" />}
              label="Core assets updated"
              ok={log.maintenance.coreAssetsUpdated}
            />
            <LogRow
              icon={<ShieldCheck className="size-3.5" />}
              label="User registry ensured"
              ok={log.maintenance.userRegistryEnsured}
            />
            {log.maintenance.redundantGeminiSymlinkRemoved && (
              <LogRow
                icon={<Link2 className="size-3.5" />}
                label="Redundant Gemini symlink removed"
                ok={true}
              />
            )}
          </div>

          {/* Per-adapter link results */}
          {log.results.map((adapterResult) => (
            <div key={adapterResult.adapterName} className="px-3 py-2.5 space-y-1">
              <div className="text-[0.68rem] uppercase tracking-wider text-hub-text-faint mb-2 font-semibold flex items-center gap-1.5">
                <Link2 className="size-3" />
                {adapterResult.adapterName} links
              </div>
              {adapterResult.links.length === 0 ? (
                <div className="text-[0.73rem] text-hub-text-faint italic pl-1">No links configured</div>
              ) : (
                adapterResult.links.map((link, idx) => {
                  const failed = !!link.error || link.result === "failed"
                  return (
                    <div key={idx} className="flex items-start gap-2 text-[0.73rem]">
                      <div className="mt-0.5 shrink-0">
                        {failed ? (
                          <AlertCircle className="size-3.5 text-hub-err" />
                        ) : (
                          <CheckCircle2 className="size-3.5 text-hub-user" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={failed ? "text-hub-err" : "text-hub-text"}>
                          {link.description}
                        </span>
                        <span className="ml-1.5 text-hub-text-faint">
                          —{" "}
                          <span className="font-hub-mono text-[0.68rem]">
                            {link.result}
                          </span>
                        </span>
                        {link.error && (
                          <div className="text-hub-err text-[0.68rem] mt-0.5 font-hub-mono truncate">
                            {link.error}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LogRow({
  icon,
  label,
  ok,
}: {
  icon: React.ReactNode
  label: string
  ok: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-[0.73rem]">
      <span className={ok ? "text-hub-user" : "text-hub-err"}>{icon}</span>
      <span className={ok ? "text-hub-text" : "text-hub-err"}>{label}</span>
      <span className="ml-auto shrink-0">
        {ok ? (
          <CheckCircle2 className="size-3.5 text-hub-user" />
        ) : (
          <AlertCircle className="size-3.5 text-hub-err" />
        )}
      </span>
    </div>
  )
}

export function StatusView() {
  const [data, setData] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [setupInProgress, setSetupInProgress] = useState(false)
  const [maintenanceLog, setMaintenanceLog] = useState<MaintenanceLog | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const res = await apiRequest<StatusData>("/api/status")
      setData(res)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const runSetup = async (ide?: string) => {
    setMaintenanceLog(null)
    try {
      setSetupInProgress(true)
      toast.loading(ide ? `Running maintenance for ${ide}…` : "Running maintenance…", {
        id: "maintenance-toast",
      })
      const result = await apiRequest<MaintenanceLog>("/api/setup", {
        method: "POST",
        body: ide ? { ide } : {},
      })
      setMaintenanceLog(result)

      const totalLinks = result.results.reduce((s, r) => s + r.links.length, 0)
      const failedLinks = result.results.reduce(
        (s, r) => s + r.links.filter((l) => l.error || l.result === "failed").length,
        0,
      )

      if (failedLinks > 0) {
        toast.warning(
          `Maintenance done — ${failedLinks} of ${totalLinks} link${totalLinks !== 1 ? "s" : ""} failed.`,
          { id: "maintenance-toast" },
        )
      } else {
        toast.success(
          `Maintenance complete — ${totalLinks} link${totalLinks !== 1 ? "s" : ""} updated successfully.`,
          { id: "maintenance-toast" },
        )
      }

      await fetchStatus()
    } catch (err: any) {
      toast.error(err.message, { id: "maintenance-toast" })
    } finally {
      setSetupInProgress(false)
    }
  }

  if (loading && !data) {
    return <div className="p-4 text-hub-text-dim">Loading status...</div>
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-md border border-hub-err/40 bg-hub-err/10 p-3 text-hub-err text-sm">
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  const issuesCount = data.adapters.reduce((acc, adapter) => {
    return acc + (adapter.links?.filter((l) => l.status !== "ok").length ?? 0)
  }, 0)

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-4 mb-4">
        <h1 className="m-0 font-hub-display text-[1.05rem] tracking-wide text-[#f5f8ff]">Status</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchStatus()}
          disabled={loading || setupInProgress}
          className="h-8 gap-2 border-hub-border bg-hub-surface-2"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      {data.initialized === false && (
        <div className="rounded-md border border-hub-warn/50 bg-hub-warn/12 px-3 py-2.5 text-[0.79rem] text-[#ffe3b3]">
          Hub not initialized yet. Use maintenance actions below to initialize in-place.
        </div>
      )}

      {issuesCount > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-hub-warn/45 bg-hub-warn/12 px-3 py-2.5 text-[#f8dcb0]">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="size-4" />
            <span>{issuesCount} issue(s) detected</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runSetup()}
            disabled={setupInProgress}
            className="h-8 gap-2 border-hub-warn/55 text-hub-warn hover:bg-hub-warn/10"
          >
            {setupInProgress ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                Running…
              </>
            ) : (
              "Repair all links"
            )}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-md border border-hub-user/45 bg-hub-user/10 px-3 py-2.5 text-hub-user">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4" />
            <span>All detected adapter links are healthy</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runSetup()}
            disabled={setupInProgress}
            className="h-8 gap-2 border-hub-border text-hub-text-dim hover:text-hub-text hover:bg-hub-surface-2"
          >
            {setupInProgress ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                Running…
              </>
            ) : (
              "Run maintenance"
            )}
          </Button>
        </div>
      )}

      {/* Maintenance report — shown after a run */}
      {maintenanceLog && <MaintenanceReport log={maintenanceLog} />}

      <div className="space-y-3">
        {data.adapters.map((adapter) => (
          <Card
            key={adapter.name}
            className="overflow-hidden border-hub-border bg-hub-surface-1/85 shadow-none rounded-md"
          >
            <div className="flex items-center justify-between gap-3 border-b border-hub-border px-3 py-2.5">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-semibold text-sm text-[#f5f8ff]">{adapter.name}</span>
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
                      (adapter.links?.filter((l) => l.status !== "ok").length ?? 0) === 0
                        ? "border-hub-user/40 text-hub-user"
                        : "border-hub-err/40 text-hub-err"
                    }`}
                  >
                    {(adapter.links?.filter((l) => l.status !== "ok").length ?? 0) === 0
                      ? "healthy"
                      : `${adapter.links?.filter((l) => l.status !== "ok").length} issue(s)`}
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
                      onClick={() => runSetup(adapter.name)}
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
        ))}
      </div>
    </div>
  )
}
