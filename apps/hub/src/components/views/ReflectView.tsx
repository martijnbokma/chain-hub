import { useState, useEffect } from "react"
import { apiRequest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { 
  Sparkles, 
  Eye, 
  Play, 
  FolderOpen, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
  ExternalLink
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface PreviewData {
  message: string
  hasQueuedEvents: boolean
  eventCount: number
}

interface RunResult {
  message: string
  eventCount: number
  draftsPath: string
  generated: string[]
}

export function ReflectView() {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [lastRunAt, setLastRunAt] = useState<number | null>(null)

  const formatRelative = (ts: number | null) => {
    if (!ts) return "Never"
    const diffMs = Date.now() - ts
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000))
    if (diffMinutes < 1) return "just now"
    if (diffMinutes < 60) return `${diffMinutes} min ago`
    const diffHours = Math.round(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
    const diffDays = Math.round(diffHours / 24)
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  }

  const handlePreview = async () => {
    try {
      setLoading(true)
      const res = await apiRequest<PreviewData>("/api/reflect/preview", { method: "POST" })
      setPreview(res)
      setRunResult(null)
      if (res.hasQueuedEvents) {
        toast.success(res.message)
      } else {
        toast.warning(res.message)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async () => {
    try {
      setLoading(true)
      const res = await apiRequest<RunResult>("/api/reflect/run", { method: "POST" })
      setRunResult(res)
      setLastRunAt(Date.now())
      setPreview(null)
      toast.success(res.message)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="m-0 font-hub-display text-[1.05rem] tracking-wide text-[#f5f8ff]">Reflect</h1>
        <p className="text-[0.78rem] text-hub-text-dim max-w-2xl">
          Distill recent queued learnings from your coding sessions into structured draft notes and patterns.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <div className="p-6 rounded-lg border border-hub-border bg-hub-surface-1/40 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-hub-accent/10 text-hub-accent">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">Learning Distillation</div>
                  <div className="text-[0.7rem] text-hub-text-faint flex items-center gap-1.5 mt-0.5">
                    <Clock className="size-3" />
                    Last run: {formatRelative(lastRunAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePreview} 
                  disabled={loading}
                >
                  {loading && !runResult ? <Loader2 className="size-3.5 animate-spin mr-2" /> : <Eye className="size-3.5 mr-2" />}
                  Preview
                </Button>
                <Button 
                  onClick={handleRun} 
                  disabled={loading || (preview !== null && !preview.hasQueuedEvents)}
                >
                  {loading && runResult ? <Loader2 className="size-3.5 animate-spin mr-2" /> : <Play className="size-3.5 mr-2" />}
                  Run Distillation
                </Button>
              </div>
            </div>

            {preview && (
              <div className={`p-4 rounded-md border ${preview.hasQueuedEvents ? "bg-hub-success/5 border-hub-success/20" : "bg-hub-warn/5 border-hub-warn/20"}`}>
                <div className="flex items-start gap-3">
                  {preview.hasQueuedEvents ? (
                    <CheckCircle2 className="size-4 text-hub-success mt-0.5" />
                  ) : (
                    <AlertTriangle className="size-4 text-hub-warn mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className={`text-[0.75rem] font-bold uppercase ${preview.hasQueuedEvents ? "text-hub-success" : "text-hub-warn"}`}>
                      {preview.hasQueuedEvents ? "Ready to reflect" : "No new learnings"}
                    </div>
                    <p className="text-[0.78rem] text-hub-text-dim">
                      {preview.message}
                    </p>
                    {preview.hasQueuedEvents && (
                      <div className="mt-2">
                         <Badge variant="outline" className="text-[0.65rem] border-hub-success/30 text-hub-success/80 bg-hub-success/5">
                          {preview.eventCount} events queued
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {runResult && (
              <div className="space-y-4">
                <div className="p-4 rounded-md bg-hub-accent/5 border border-hub-accent/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-4 text-hub-accent mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <div className="text-[0.75rem] font-bold uppercase text-hub-accent">
                        Reflection Complete
                      </div>
                      <p className="text-[0.78rem] text-hub-text-dim">
                        {runResult.message}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                         <Badge variant="outline" className="text-[0.65rem] border-hub-accent/30 text-hub-accent/80">
                          {runResult.eventCount} events processed
                        </Badge>
                         <Badge variant="outline" className="text-[0.65rem] border-hub-accent/30 text-hub-accent/80 flex items-center gap-1">
                          <FolderOpen className="size-2.5" />
                          {runResult.generated.length} files generated
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-[0.7rem] font-bold uppercase tracking-wider text-hub-text-faint px-1">Generated Drafts</h3>
                  <div className="grid gap-2">
                    {runResult.generated.map((file, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between p-3 rounded border border-hub-border bg-hub-surface-1/60 hover:bg-hub-surface-2 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="size-3.5 text-hub-text-faint" />
                          <span className="text-[0.75rem] text-white truncate font-medium">{file}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="size-7 text-hub-text-faint hover:text-white" asChild>
                          <a href={`file://${runResult.draftsPath}/${file}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-3.5" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href={`file://${runResult.draftsPath}`} target="_blank" rel="noopener noreferrer">
                      <FolderOpen className="size-3.5 mr-2" />
                      Open Drafts Folder
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-lg border border-hub-border bg-hub-surface-2/40 space-y-4">
            <h2 className="text-white text-xs font-bold uppercase tracking-widest">How it works</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="text-[0.75rem] font-bold text-hub-accent">1. Capture</div>
                <p className="text-[0.7rem] text-hub-text-dim leading-relaxed">
                  Learnable moments are automatically queued during your work in supported editors.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="text-[0.75rem] font-bold text-hub-accent">2. Preview</div>
                <p className="text-[0.7rem] text-hub-text-dim leading-relaxed">
                  Check if there are enough learnings to trigger a distillation run.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="text-[0.75rem] font-bold text-hub-accent">3. Distill</div>
                <p className="text-[0.7rem] text-hub-text-dim leading-relaxed">
                  The engine processes events into draft skills and patterns in your hub.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
