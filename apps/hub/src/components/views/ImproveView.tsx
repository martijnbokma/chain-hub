import { useState, useEffect } from "react"
import { apiRequest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Zap, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Play, 
  AlertTriangle,
  Loader2,
  FileCode,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  Plus,
  Archive
} from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface Proposal {
  id: string
  kind: string
  summary: string
  rationale: string
  target_path: string
  risk_level: string
  confidence: number
  diff_preview: string
  status: "pending" | "approved" | "rejected" | "applied"
}

export function ImproveView() {
  const [loading, setLoading] = useState(false)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [lastRunId, setLastRunId] = useState<string | null>(null)
  const [isRollbackConfirmOpen, setIsRollbackConfirmOpen] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await apiRequest<{ proposals: Proposal[] }>("/api/improve/proposals")
      setProposals(res.proposals || [])
    } catch (err: any) {
      toast.error(`Failed to load proposals: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGenerate = async () => {
    try {
      setLoading(true)
      const result = await apiRequest<{ runId: string, generated: number }>("/api/improve/proposals/generate", {
        method: "POST",
        body: { maxProposals: 3, scopes: ["skills"] }
      })
      setLastRunId(result.runId)
      await loadData()
      toast.success(`Generated ${result.generated} proposal(s).`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (id: string, action: "approve" | "reject") => {
    try {
      setLoading(true)
      await apiRequest(`/api/improve/proposals/${encodeURIComponent(id)}/${action}`, { method: "POST" })
      await loadData()
      toast.success(`Proposal ${action === "approve" ? "approved" : "rejected"}.`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    const approved = proposals.filter(p => p.status === "approved").map(p => p.id)
    if (approved.length === 0) {
      toast.error("No approved proposals to apply.")
      return
    }

    try {
      setLoading(true)
      const result = await apiRequest<{ runId: string, applied: number, validation: string }>("/api/improve/apply", {
        method: "POST",
        body: { proposalIds: approved }
      })
      setLastRunId(result.runId)
      await loadData()
      toast.success(`Applied ${result.applied} proposal(s). Validation: ${result.validation}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = async () => {
    if (!lastRunId) return

    try {
      setLoading(true)
      const result = await apiRequest<{ restored: number }>(`/api/improve/runs/${encodeURIComponent(lastRunId)}/rollback`, { 
        method: "POST" 
      })
      await loadData()
      toast.success(`Rolled back ${result.restored} file(s).`)
      setLastRunId(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    try {
      setLoading(true)
      const result = await apiRequest<{ archived: number }>("/api/improve/proposals/archive", { method: "POST" })
      await loadData()
      if (result.archived > 0) {
        toast.success(`${result.archived} voorstel(len) gearchiveerd.`)
      } else {
        toast.info("Geen voorstellen om te archiveren.")
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getKindBadge = (kind: string) => {
    const k = kind.replace("_patch", "")
    const colors: Record<string, string> = {
      skill: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      rule: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      agent: "bg-green-500/10 text-green-400 border-green-500/30",
      workflow: "bg-orange-500/10 text-orange-400 border-orange-500/30"
    }
    return <Badge variant="outline" className={`text-[0.62rem] uppercase tracking-wider ${colors[k] || "bg-hub-surface-2 text-hub-text-faint border-hub-border"}`}>{k}</Badge>
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 font-hub-display text-[1.05rem] tracking-wide text-[#f5f8ff]">Improve</h1>
          <p className="text-[0.78rem] text-hub-text-dim mt-1">Autonomous improvement engine for your Chain Hub assets.</p>
        </div>
        <div className="flex items-center gap-2">
          {lastRunId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsRollbackConfirmOpen(true);
              }}
              disabled={loading}
              className="h-8 border-hub-err/30 text-hub-err/70 hover:bg-hub-err/10 hover:text-hub-err"
            >
              <RotateCcw className="size-3.5 mr-1.5" />
              Rollback Last Run
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGenerate}
            disabled={loading}
            className="h-8 border-hub-border-strong text-hub-text hover:text-white"
          >
            {loading && !lastRunId ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Zap className="size-3.5 mr-1.5 text-hub-accent" />}
            Generate Proposals
          </Button>
          <Button 
            size="sm" 
            onClick={handleApply}
            disabled={loading || !proposals.some(p => p.status === "approved")}
            className="h-8 bg-hub-accent hover:bg-hub-accent/90 text-white"
          >
            {loading && lastRunId ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Play className="size-3.5 mr-1.5" />}
            Apply Approved
          </Button>
        </div>
      </header>

      <div className="grid gap-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="size-4 text-hub-accent" />
            Proposal Queue ({proposals.length})
          </h2>
          {proposals.some(p => p.status === "applied" || p.status === "rejected") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              disabled={loading}
              className="h-7 px-2 text-[0.65rem] text-hub-text-faint hover:text-hub-accent hover:bg-hub-accent/10 transition-colors uppercase font-bold tracking-widest gap-1.5"
            >
              <Archive className="size-3" />
              Archiveren
            </Button>
          )}
        </div>

        {proposals.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-hub-border rounded-lg bg-hub-surface-1/20">
            <div className="size-10 rounded-full bg-hub-surface-2 flex items-center justify-center mx-auto mb-3">
              <Zap className="size-5 text-hub-text-faint" />
            </div>
            <p className="text-[0.8rem] text-hub-text-dim max-w-sm mx-auto">
              No proposals in the queue. Click "Generate Proposals" to let the engine analyze your learnings and suggest improvements.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {proposals.map((proposal) => (
              <div 
                key={proposal.id}
                className="rounded-lg border border-hub-border bg-hub-surface-1/40 overflow-hidden flex flex-col md:flex-row"
              >
                <div className="flex-1 p-5 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {getKindBadge(proposal.kind)}
                      <code className="text-[0.68rem] text-hub-text-faint bg-hub-surface-1/80 px-1.5 py-0.5 rounded border border-hub-border-strong/50">
                        {proposal.target_path}
                      </code>
                    </div>
                    <h3 className="font-bold text-white text-sm leading-snug">{proposal.summary}</h3>
                  </div>

                  <div className="flex flex-wrap gap-4 text-[0.68rem] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-hub-success" />
                      <span className="text-hub-text-faint">Risk:</span>
                      <span className={proposal.risk_level === "low" ? "text-hub-success" : proposal.risk_level === "medium" ? "text-hub-warn" : "text-hub-err"}>
                        {proposal.risk_level}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="size-3.5 text-hub-accent" />
                      <span className="text-hub-text-faint">Confidence:</span>
                      <span className="text-white">{Math.round(proposal.confidence * 100)}%</span>
                    </div>
                  </div>

                  <p className="text-[0.78rem] text-hub-text-dim leading-relaxed">
                    {proposal.rationale}
                  </p>

                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant={proposal.status === "approved" ? "default" : "outline"}
                      onClick={() => handleDecision(proposal.id, "approve")}
                      disabled={loading || proposal.status === "applied"}
                      className={`h-8 gap-1.5 text-xs ${proposal.status === "approved" ? "bg-hub-success hover:bg-hub-success/90" : "border-hub-border text-hub-text hover:text-white"}`}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant={proposal.status === "rejected" ? "default" : "outline"}
                      onClick={() => handleDecision(proposal.id, "reject")}
                      disabled={loading || proposal.status === "applied"}
                      className={`h-8 gap-1.5 text-xs ${proposal.status === "rejected" ? "bg-hub-err hover:bg-hub-err/90" : "border-hub-border text-hub-text hover:text-white"}`}
                    >
                      <XCircle className="size-3.5" />
                      Reject
                    </Button>
                    
                    <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded bg-hub-surface-2 text-[0.65rem] text-hub-text-faint font-bold uppercase tracking-widest border border-hub-border-strong/40">
                      Status: <span className={proposal.status === "applied" ? "text-hub-accent" : "text-white"}>{proposal.status}</span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-[340px] border-t md:border-t-0 md:border-l border-hub-border bg-black/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[0.65rem] font-bold text-hub-text-faint uppercase tracking-widest flex items-center gap-1.5">
                      <FileCode className="size-3.5" />
                      Diff Preview
                    </div>
                  </div>
                  <pre className="text-[0.68rem] text-hub-text-dim font-mono bg-black/30 p-3 rounded border border-hub-border-strong/30 h-[200px] overflow-auto leading-relaxed">
                    {proposal.diff_preview}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={isRollbackConfirmOpen}
        onOpenChange={setIsRollbackConfirmOpen}
        onConfirm={handleRollback}
        title="Rollback Changes?"
        description="Are you sure you want to rollback the last applied changes? This will restore your files to their previous state."
        confirmText="Rollback"
        variant="destructive"
        isLoading={loading}
      />
    </div>
  )
}
