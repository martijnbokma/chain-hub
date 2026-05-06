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
  Maximize2
} from "lucide-react"
import { toast } from "sonner"
import { MarkdownPreview } from "./MarkdownPreview"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FocusModal } from "./FocusModal"

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
}

export function SkillDetail({ slug, onBack }: SkillDetailProps) {
  const [data, setData] = useState<SkillData | null>(null)
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [focusMode, setFocusMode] = useState<"editor" | "preview" | null>(null)

  useEffect(() => {
    const fetchSkill = async () => {
      try {
        setLoading(true)
        const res = await apiRequest<SkillData>(`/api/skills/${slug}`)
        setData(res)
        setDraft(res.content)
      } catch (err: any) {
        toast.error(`Failed to load skill: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchSkill()
  }, [slug])

  const handleSave = async () => {
    if (!data || data.isCore) return
    try {
      setSaving(true)
      await apiRequest(`/api/skills/${slug}`, {
        method: "POST",
        body: JSON.stringify({ content: draft })
      })
      toast.success(`Skill '${slug}' saved successfully.`)
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    try {
      setValidating(true)
      const res = await apiRequest<ValidationResult>(`/api/skills/${slug}/validate`)
      setValidation(res)
      if (res.errors && res.errors.length > 0) {
        toast.error(`Validation failed for '${slug}'`)
      } else if (res.warnings && res.warnings.length > 0) {
        toast.warning(`Validation passed with warnings for '${slug}'`)
      } else {
        toast.success(`Validation passed for '${slug}'`)
      }
    } catch (err: any) {
      toast.error(`Validation error: ${err.message}`)
    } finally {
      setValidating(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to remove skill '${slug}'? This cannot be undone.`)) return
    try {
      await apiRequest(`/api/skills/${slug}`, { method: "DELETE" })
      toast.success(`Skill '${slug}' removed.`)
      onBack()
    } catch (err: any) {
      toast.error(`Failed to remove skill: ${err.message}`)
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

      <header className="flex items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2 text-hub-text-dim hover:text-white hover:bg-hub-surface-3 transition-colors">
            <ArrowLeft className="size-4 mr-1.5" />
            Skills
          </Button>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-white text-lg">{slug}</span>
            <Badge variant="outline" className="text-[0.65rem] border-hub-border text-hub-text-faint bg-hub-surface-2">
              {data.bucket}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleValidate} 
            disabled={validating}
            className="h-8 border-hub-border-strong bg-hub-surface-2 text-hub-text hover:bg-hub-surface-3 hover:text-white transition-colors"
          >
            <AlertTriangle className="size-3.5 mr-1.5" />
            Validate
          </Button>

          {!data.isCore && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRemove}
                className="h-8 border-hub-err/30 text-hub-err/80 hover:bg-hub-err/10 hover:text-hub-err"
              >
                <Trash2 className="size-3.5 mr-1.5" />
                Remove
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="h-8 bg-hub-accent hover:bg-hub-accent/90 text-white"
              >
                <Save className="size-3.5 mr-1.5" />
                Save
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Editor Pane */}
        <div className="flex flex-col border border-hub-border rounded-lg bg-hub-surface-1 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-hub-surface-2 border-b border-hub-border">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="size-3.5 text-hub-text-faint shrink-0" />
              <span className="text-[0.7rem] font-bold text-hub-text-dim truncate uppercase tracking-wider">{slug}.md</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setFocusMode("editor")}
                    className="size-6 text-hub-text-faint hover:text-white hover:bg-hub-surface-3 transition-colors"
                  >
                    <Maximize2 className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Focus editor</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={data.isCore}
            className="flex-1 resize-none bg-hub-surface-2/60 border-none focus-visible:ring-0 font-mono text-[0.8rem] p-4 text-hub-text leading-relaxed"
          />
        </div>

        {/* Preview Pane */}
        <div className="flex flex-col border border-hub-border rounded-lg bg-hub-surface-1 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-hub-surface-2 border-b border-hub-border">
            <div className="flex items-center gap-2 min-w-0">
              <Eye className="size-3.5 text-hub-text-faint shrink-0" />
              <span className="text-[0.7rem] font-bold text-hub-text-dim truncate uppercase tracking-wider">Preview</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setFocusMode("preview")}
                    className="size-6 text-hub-text-faint hover:text-white hover:bg-hub-surface-3 transition-colors"
                  >
                    <Maximize2 className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Focus preview</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <MarkdownPreview content={draft} className="p-4 prose prose-invert prose-sm max-w-none" />
        </div>
      </div>

      {validation && (
        <div className="border border-hub-border rounded-lg bg-hub-surface-2 p-4 space-y-3">
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
        </div>
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
    </div>
  )
}
