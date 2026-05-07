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
  ExternalLink,
  Info
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { ViewHeader } from "@/components/layout/ViewHeader"
import { ViewContainer } from "@/components/layout/ViewContainer"

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
      <ViewHeader 
        title="Reflect" 
        description="Distill recent queued learnings from your coding sessions into structured draft notes and patterns."
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6">
          <ViewContainer className="p-8 space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-hub-accent/10 text-hub-accent shadow-inner ring-1 ring-hub-accent/20">
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <div className="font-bold text-white text-base">Learning Distillation</div>
                  <div className="text-[0.75rem] text-hub-text-faint flex items-center gap-2 mt-1">
                    <Clock className="size-3.5" />
                    Last run: {formatRelative(lastRunAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePreview} 
                  disabled={loading}
                  className="h-10 px-4 gap-2 border-hub-border bg-hub-surface-1/40 hover:bg-hub-surface-2 transition-all"
                >
                  {loading && !runResult ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                  Preview
                </Button>
                <Button 
                  onClick={handleRun} 
                  disabled={loading || (preview !== null && !preview.hasQueuedEvents)}
                  className="h-10 px-5 gap-2 bg-hub-accent hover:bg-hub-accent/90 text-white shadow-lg shadow-hub-accent/20 transition-all font-semibold"
                >
                  {loading && runResult ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  Run Distillation
                </Button>
              </div>
            </div>

            {preview && (
              <div className={`p-5 rounded-xl border animate-in zoom-in duration-300 ${preview.hasQueuedEvents ? "bg-hub-success/5 border-hub-success/20" : "bg-hub-warn/5 border-hub-warn/20"}`}>
                <div className="flex items-start gap-4">
                  {preview.hasQueuedEvents ? (
                    <CheckCircle2 className="size-5 text-hub-success mt-0.5" />
                  ) : (
                    <AlertTriangle className="size-5 text-hub-warn mt-0.5" />
                  )}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className={`text-[0.75rem] font-bold uppercase tracking-widest ${preview.hasQueuedEvents ? "text-hub-success" : "text-hub-warn"}`}>
                      {preview.hasQueuedEvents ? "Ready to reflect" : "No new learnings"}
                    </div>
                    <p className="text-[0.8rem] text-hub-text-dim leading-relaxed">
                      {preview.message}
                    </p>
                    {preview.hasQueuedEvents && (
                      <div className="mt-3">
                         <Badge variant="outline" className="text-[0.65rem] font-bold border-hub-success/30 text-hub-success/80 bg-hub-success/5 px-2.5 py-0.5">
                          {preview.eventCount} events queued
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {runResult && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="p-5 rounded-xl bg-hub-accent/5 border border-hub-accent/20">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="size-5 text-hub-accent mt-0.5" />
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="text-[0.75rem] font-bold uppercase tracking-widest text-hub-accent">
                        Reflection Complete
                      </div>
                      <p className="text-[0.8rem] text-hub-text-dim leading-relaxed">
                        {runResult.message}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                         <Badge variant="outline" className="text-[0.65rem] font-bold border-hub-accent/30 text-hub-accent/80 px-2.5 py-0.5">
                          {runResult.eventCount} events processed
                        </Badge>
                         <Badge variant="outline" className="text-[0.65rem] font-bold border-hub-accent/30 text-hub-accent/80 flex items-center gap-1.5 px-2.5 py-0.5">
                          <FolderOpen className="size-3" />
                          {runResult.generated.length} files generated
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-hub-text-faint px-1 flex items-center gap-2">
                    <FileText className="size-3.5" />
                    Generated Drafts
                  </h3>
                  <div className="grid gap-2.5">
                    {runResult.generated.map((file, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between p-4 rounded-xl border border-hub-border bg-hub-surface-1/60 hover:bg-hub-surface-2 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="size-4 text-hub-text-faint group-hover:text-hub-accent transition-colors" />
                          <span className="text-[0.8rem] text-white truncate font-medium">{file}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="size-8 text-hub-text-faint hover:text-white hover:bg-white/5" asChild>
                          <a href={`file://${runResult.draftsPath}/${file}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="outline" size="sm" className="w-full h-11 border-dashed border-hub-border hover:border-hub-accent/50 hover:bg-hub-accent/5 transition-all text-hub-text-dim hover:text-hub-accent" asChild>
                    <a href={`file://${runResult.draftsPath}`} target="_blank" rel="noopener noreferrer">
                      <FolderOpen className="size-4 mr-2" />
                      Open Drafts Folder
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </ViewContainer>
        </div>

        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <ViewContainer className="p-6 space-y-6">
            <h2 className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 opacity-80">
              <Info className="size-4 text-hub-accent" />
              How it works
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-[0.75rem] font-bold text-hub-accent flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-full bg-hub-accent/10 text-[0.6rem]">1</span>
                  Capture
                </div>
                <p className="text-[0.75rem] text-hub-text-dim leading-relaxed pl-7">
                  Learnable moments are automatically queued during your work in supported editors.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-[0.75rem] font-bold text-hub-accent flex items-center gap-2">
                   <span className="flex items-center justify-center size-5 rounded-full bg-hub-accent/10 text-[0.6rem]">2</span>
                  Preview
                </div>
                <p className="text-[0.75rem] text-hub-text-dim leading-relaxed pl-7">
                  Check if there are enough learnings to trigger a distillation run.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-[0.75rem] font-bold text-hub-accent flex items-center gap-2">
                   <span className="flex items-center justify-center size-5 rounded-full bg-hub-accent/10 text-[0.6rem]">3</span>
                  Distill
                </div>
                <p className="text-[0.75rem] text-hub-text-dim leading-relaxed pl-7">
                  The engine processes events into draft skills and patterns in your hub.
                </p>
              </div>
            </div>
          </ViewContainer>
        </div>
      </div>
    </div>
  )
}
