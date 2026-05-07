import { useState, useEffect } from "react"
import { apiRequest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  AlertTriangle,
  FileText,
  Eye,
  EyeOff,
  Maximize2,
  Pencil,
  Check,
  X,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { MarkdownPreview } from "./MarkdownPreview"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FocusModal } from "./FocusModal"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ViewContainer } from "@/components/layout/ViewContainer"

interface SkillDetailProps {
  slug: string
  onBack: () => void
}

interface ValidationResult {
  errors?: string[]
  warnings?: string[]
}

interface SkillData {
  content: string
  isCore: boolean
  bucket: string
  githubOwner?: string
  credits?: string
  deactivated: boolean
}

interface SaveBody {
  content: string
  newSlug?: string
}

// ---------------------------------------------------------------------------
// SkillEditor — editor pane (header bar + textarea)
// ---------------------------------------------------------------------------

interface SkillEditorProps {
  slug: string
  draft: string
  onChange: (value: string) => void
  onFocus: () => void
}

function SkillEditor({ slug, draft, onChange, onFocus }: SkillEditorProps) {
  return (
    <ViewContainer className="flex flex-col overflow-hidden p-0 border-hub-border/50 group/editor">
      <div className="flex items-center justify-between px-3 py-2 bg-hub-surface-2/60 border-b border-hub-border group-focus-within/editor:border-hub-accent/30 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="size-3.5 text-hub-text-faint shrink-0" />
          <span className="text-[0.7rem] font-bold text-hub-text-dim truncate uppercase tracking-wider">{slug}.md</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onFocus}
                  className="size-6 text-hub-text-faint hover:text-white hover:bg-hub-surface-3 transition-colors"
                >
                  <Maximize2 className="size-3" />
                </Button>
              }
            />
            <TooltipContent>Focus editor</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Textarea
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 resize-none bg-transparent border-none focus-visible:ring-0 font-hub-mono text-[0.8rem] p-4 text-hub-text leading-relaxed min-h-[300px]"
      />
    </ViewContainer>
  )
}

// ---------------------------------------------------------------------------
// SkillDetail — main view
// ---------------------------------------------------------------------------

export function SkillDetail({ slug, onBack }: SkillDetailProps) {
  const [data, setData] = useState<SkillData | null>(null)
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [focusMode, setFocusMode] = useState<"editor" | "preview" | null>(null)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
  const [isEditingSlug, setIsEditingSlug] = useState(false)
  const [slugDraft, setSlugDraft] = useState(slug)

  useEffect(() => {
    const fetchSkill = async () => {
      try {
        setLoading(true)
        const res = await apiRequest<SkillData>(`/api/skills/${slug}`)
        setData(res)
        setDraft(res.content)
        setSlugDraft(slug)
      } catch (err: unknown) {
        toast.error(`Failed to load skill: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }
    fetchSkill()
  }, [slug])

  const handleSave = async () => {
    if (!data || data.isCore) return
    const slugChanged = slugDraft !== slug && slugDraft.trim().length > 0
    try {
      setSaving(true)
      const body: SaveBody = { content: draft }
      if (slugChanged) {
        body.newSlug = slugDraft.trim()
      }
      await apiRequest(`/api/skills/${slug}`, {
        method: "PUT",
        body
      })
      toast.success(`Skill saved successfully.`)
      if (slugChanged) {
        setIsEditingSlug(false)
      }
    } catch (err: unknown) {
      toast.error(`Failed to save: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleDeactivated = async () => {
    if (!data) return
    const newState = !data.deactivated
    try {
      await apiRequest(`/api/skills/${slug}/toggle`, {
        method: "POST",
        body: { enabled: !newState } 
      })
      setData({ ...data, deactivated: newState })
      toast.success(newState ? `Skill '${slug}' gedeactiveerd.` : `Skill '${slug}' geactiveerd.`)
    } catch (err: unknown) {
      toast.error(`Actie mislukt: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleValidate = async () => {
    try {
      setValidating(true)
      const res = await apiRequest<ValidationResult>(`/api/skills/${slug}/validate`, { method: "POST" })
      setValidation(res)
      if (res.errors && res.errors.length > 0) {
        toast.error(`Validation failed for '${slug}'`)
      } else if (res.warnings && res.warnings.length > 0) {
        toast.warning(`Validation passed with warnings for '${slug}'`)
      } else {
        toast.success(`Validation passed for '${slug}'`)
      }
    } catch (err: unknown) {
      toast.error(`Validation error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setValidating(false)
    }
  }

  const handleRemove = async () => {
    try {
      await apiRequest(`/api/skills/${slug}`, { method: "DELETE" })
      toast.success(`Skill '${slug}' removed.`)
      onBack()
    } catch (err: unknown) {
      toast.error(`Failed to remove skill: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-hub-text-dim">Loading skill details...</div>
  }

  if (!data) return null

  return (
    <div className="flex flex-col h-full space-y-4">
      {data.isCore && (
        <div className="p-2 px-3 text-[0.7rem] bg-hub-warn/10 text-hub-warn border border-hub-warn/20 rounded flex items-center gap-2">
          <AlertTriangle className="size-3.5" />
          Protected core skill: read-only.
        </div>
      )}

      <header className="flex flex-row items-center justify-between gap-4 py-2 mb-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack} 
            className="h-9 w-9 p-0 rounded-full bg-hub-surface-2 hover:bg-hub-surface-3 border border-hub-border transition-all duration-300"
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[0.65rem] uppercase font-bold tracking-[0.1em] text-hub-text-faint">Skills</span>
              {data.bucket && data.bucket !== "unknown" && (
                <Badge 
                  className={`h-4 px-1.5 text-[0.6rem] border-0 rounded-full font-bold uppercase tracking-widest flex items-center shrink-0 ${
                    (data.isCore || data.bucket === "chain_hub")
                      ? "bg-hub-accent/10 text-hub-accent ring-1 ring-hub-accent/30" 
                      : data.bucket === "community"
                        ? "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30"
                        : data.bucket === "personal"
                          ? "bg-hub-user/10 text-hub-user ring-1 ring-hub-user/30"
                          : "bg-white/5 text-hub-text-faint ring-1 ring-white/10"
                  }`}
                >
                  {data.bucket}
                </Badge>
              )}
              {data.githubOwner && (
                <div className="text-[0.6rem] text-hub-accent/70 uppercase font-bold tracking-widest flex items-center gap-1">
                  <span className="text-hub-text-faint/30">•</span>
                  {data.githubOwner}
                </div>
              )}
            </div>

            {isEditingSlug ? (
              <div className="flex items-center gap-2 mt-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <Input 
                  value={slugDraft}
                  onChange={(e) => setSlugDraft(e.target.value)}
                  className="h-8 py-0 text-lg font-bold bg-hub-surface-3 border-hub-accent/40 text-white min-w-[200px] focus:border-hub-accent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setIsEditingSlug(false)
                    if (e.key === "Escape") { setSlugDraft(slug); setIsEditingSlug(false); }
                  }}
                />
                <Button size="icon" variant="ghost" onClick={() => setIsEditingSlug(false)} className="size-8 text-hub-success hover:bg-hub-success/10">
                  <Check className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setSlugDraft(slug); setIsEditingSlug(false); }} className="size-8 text-hub-err hover:bg-hub-err/10">
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="group/title flex items-center gap-2 -mt-0.5">
                <div className="relative flex items-center justify-center shrink-0 mr-1">
                  <div className={`absolute inset-0 rounded-full blur-[6px] opacity-40 animate-pulse ${
                    data.deactivated ? "bg-transparent" : (data.isCore ? "bg-hub-core" : "bg-hub-user")
                  }`} />
                  <div className={`size-2 rounded-full ring-2 ring-white/10 z-10 transition-all duration-500 ${
                    data.deactivated 
                      ? "bg-hub-text-faint/40 grayscale" 
                      : (data.isCore ? "bg-hub-core shadow-[0_0_8px_rgba(139,124,255,0.4)]" : "bg-hub-user shadow-[0_0_8px_rgba(78,224,161,0.4)]")
                  }`} />
                </div>
                <h2 className="font-hub-display font-bold text-white text-xl tracking-tight leading-tight">
                  {slug}
                </h2>
                {!data.isCore && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsEditingSlug(true)}
                    className="size-6 opacity-0 group-hover/title:opacity-100 text-hub-text-faint hover:text-white transition-all"
                  >
                    <Pencil className="size-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
            <TooltipTrigger
              render={
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleToggleDeactivated}
                  className="h-8 w-8 text-hub-text-faint hover:text-white hover:bg-hub-surface-3 transition-colors"
                >
                  {data.deactivated ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
              }
            />
              <TooltipContent>
                {data.deactivated ? "Inschakelen" : "Uitschakelen"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleValidate} 
            disabled={validating}
            className="h-8 px-2.5 md:px-3 border-hub-border-strong bg-hub-surface-2 text-hub-text hover:bg-hub-surface-3 hover:text-white transition-colors"
          >
            <AlertTriangle className="size-3.5 md:mr-1.5" />
            <span className="hidden md:inline">Validate</span>
          </Button>

          {!data.isCore && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsRemoveConfirmOpen(true)}
                className="h-8 px-2.5 md:px-3 border-hub-err/30 text-hub-err/80 hover:bg-hub-err/10 hover:text-hub-err"
              >
                <Trash2 className="size-3.5 md:mr-1.5" />
                <span className="hidden md:inline">Remove</span>
              </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || (draft === data.content && slugDraft === slug)}
                  className={`h-8 transition-all duration-300 px-2.5 md:px-4 font-semibold ${
                    (draft === data.content && slugDraft === slug)
                      ? "bg-hub-surface-3 text-hub-text-faint border border-hub-border opacity-50" 
                      : "bg-hub-accent hover:bg-hub-accent/90 text-white shadow-lg shadow-hub-accent/20"
                  }`}
                >
                  {saving ? <Loader2 className="size-3.5 md:mr-1.5 animate-spin" /> : <Save className="size-3.5 md:mr-1.5" />}
                  <span className="hidden md:inline">Save</span>
                </Button>
            </>
          )}
        </div>
      </header>

      <div className={`flex-1 min-h-0 grid grid-cols-1 ${data.isCore ? "" : "md:grid-cols-2"} gap-4 items-start`}>
        {/* Editor Pane */}
        {!data.isCore && (
          <SkillEditor
            slug={slug}
            draft={draft}
            onChange={setDraft}
            onFocus={() => setFocusMode("editor")}
          />
        )}

        {/* Preview Pane */}
        <ViewContainer className="flex flex-col overflow-hidden p-0 border-hub-border/50 group/preview min-h-[300px]">
          <div className="flex items-center justify-between px-3 py-2 bg-hub-surface-2/60 border-b border-hub-border">
            <div className="flex items-center gap-2 min-w-0">
              <Eye className="size-3.5 text-hub-text-faint shrink-0" />
              <span className="text-[0.7rem] font-bold text-hub-text-dim truncate uppercase tracking-wider">Preview</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setFocusMode("preview")}
                      className="size-6 text-hub-text-faint hover:text-white hover:bg-hub-surface-3 transition-colors"
                    >
                      <Maximize2 className="size-3" />
                    </Button>
                  }
                />
                <TooltipContent>Focus preview</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative bg-gradient-to-br from-transparent to-hub-accent/5">
            <MarkdownPreview content={draft} className="p-6 prose prose-invert prose-sm max-w-none" />
          </div>
        </ViewContainer>
      </div>

      {validation && (
        <ViewContainer className="p-4 space-y-3 border-hub-border/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-hub-text-dim">Validation Results</h3>
          <div className="space-y-4">
            {validation.errors && validation.errors.length > 0 && (
              <div className="space-y-2">
                <div className="text-[0.7rem] font-bold text-hub-err flex items-center gap-2 uppercase">
                  <AlertTriangle className="size-3" />
                  Errors
                </div>
                <ul className="text-[0.75rem] text-hub-err/90 list-disc list-inside pl-1 space-y-1">
                  {validation.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
            {validation.warnings && validation.warnings.length > 0 && (
              <div className="space-y-2">
                <div className="text-[0.7rem] font-bold text-hub-warn flex items-center gap-2 uppercase">
                  <AlertTriangle className="size-3" />
                  Warnings
                </div>
                <ul className="text-[0.75rem] text-hub-warn/90 list-disc list-inside pl-1 space-y-1">
                  {validation.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                </ul>
              </div>
            )}
            {!validation.errors?.length && !validation.warnings?.length && (
              <div className="text-[0.75rem] text-hub-success flex items-center gap-2">
                All checks passed.
              </div>
            )}
          </div>
        </ViewContainer>
      )}

      {focusMode && (
        <FocusModal
          open={!!focusMode}
          onOpenChange={(open) => !open && setFocusMode(null)}
          mode={focusMode}
          content={draft}
          onChange={setDraft}
          title={focusMode === "editor" ? `${slug}.md` : `Preview: ${slug}`}
          readOnly={data.isCore}
        />
      )}
      {isRemoveConfirmOpen && (
        <ConfirmDialog
          open={isRemoveConfirmOpen}
          onOpenChange={setIsRemoveConfirmOpen}
          onConfirm={handleRemove}
          title="Remove Skill?"
          description={`Are you sure you want to remove skill '${slug}'? This cannot be undone.`}
          confirmText="Remove"
          variant="destructive"
        />
      )}
    </div>
  )
}
