import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { MarkdownPreview } from "../skills/MarkdownPreview"
import { FocusModal } from "../skills/FocusModal"
import { ViewContainer } from "@/components/layout/ViewContainer"
import {
  ArrowLeft,
  Save,
  Trash2,
  AlertTriangle,
  FileText,
  Eye,
  Maximize2,
  Loader2,
  Pencil,
  Check,
  X,
} from "lucide-react"

interface ContentDetail {
  slug: string
  content: string
  isCore: boolean
  ext?: string
}

interface ValidationResult {
  errors?: string[]
  warnings?: string[]
}

interface ContentDetailPanelProps {
  title: string
  selectedSlug: string
  detail: ContentDetail
  draft: string
  onDraftChange: (value: string) => void
  slugDraft: string
  onSlugDraftChange: (value: string) => void
  isEditingSlug: boolean
  onIsEditingSlugChange: (value: boolean) => void
  saving: boolean
  validating: boolean
  validation: ValidationResult | null
  focusMode: "editor" | "preview" | null
  onFocusModeChange: (mode: "editor" | "preview" | null) => void
  isRemoveConfirmOpen: boolean
  onIsRemoveConfirmOpenChange: (open: boolean) => void
  onBack: () => void
  onSave: () => void
  onValidate: () => void
  onRemove: () => void
  kind: "rules" | "agents" | "workflows"
}

export function ContentDetailPanel({
  title,
  selectedSlug,
  detail,
  draft,
  onDraftChange,
  slugDraft,
  onSlugDraftChange,
  isEditingSlug,
  onIsEditingSlugChange,
  saving,
  validating,
  validation,
  focusMode,
  onFocusModeChange,
  isRemoveConfirmOpen,
  onIsRemoveConfirmOpenChange,
  onBack,
  onSave,
  onValidate,
  onRemove,
}: ContentDetailPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [draft, selectedSlug])

  const isDirty = draft !== detail.content || slugDraft !== selectedSlug

  return (
    <div className="flex flex-col h-full space-y-4">
      {detail.isCore && (
        <div className="p-2 px-3 text-[0.7rem] bg-hub-warn/10 text-hub-warn border border-hub-warn/20 rounded flex items-center gap-2">
          <AlertTriangle className="size-3.5" />
          Protected core asset: read-only.
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
              <span className="text-[0.65rem] uppercase font-bold tracking-[0.1em] text-hub-text-faint">{title}</span>
              {detail.isCore && (
                <Badge className="h-4 px-1.5 text-[0.6rem] bg-hub-accent/10 text-hub-accent border-hub-accent/20">
                  CORE
                </Badge>
              )}
            </div>

            {isEditingSlug ? (
              <div className="flex items-center gap-2 mt-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <Input
                  value={slugDraft}
                  onChange={(e) => onSlugDraftChange(e.target.value)}
                  className="h-8 py-0 text-lg font-bold bg-hub-surface-3 border-hub-accent/40 text-white min-w-[200px] focus:border-hub-accent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onIsEditingSlugChange(false)
                    if (e.key === "Escape") {
                      onSlugDraftChange(selectedSlug)
                      onIsEditingSlugChange(false)
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onIsEditingSlugChange(false)}
                  className="size-8 text-hub-success hover:bg-hub-success/10"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    onSlugDraftChange(selectedSlug)
                    onIsEditingSlugChange(false)
                  }}
                  className="size-8 text-hub-err hover:bg-hub-err/10"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="group/title flex items-center gap-2 -mt-0.5">
                <h2 className="font-hub-display font-bold text-white text-xl tracking-tight leading-tight">
                  {selectedSlug}
                </h2>
                {!detail.isCore && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onIsEditingSlugChange(true)}
                    className="size-6 opacity-0 group-hover/title:opacity-100 text-hub-text-faint hover:text-white transition-all"
                  >
                    <Pencil className="size-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onValidate}
                    disabled={validating}
                    className="h-9 px-2.5 md:px-3 border-hub-border-strong/40 bg-hub-surface-2/50 backdrop-blur-sm text-hub-text hover:text-white hover:border-hub-border-strong transition-all"
                  >
                    {validating ? (
                      <Loader2 className="size-3.5 md:mr-2 animate-spin" />
                    ) : (
                      <AlertTriangle className="size-3.5 md:mr-2" />
                    )}
                    <span className="hidden md:inline">Validate</span>
                  </Button>
                }
              />
              <TooltipContent>Run static analysis on this rule</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {!detail.isCore && <div className="h-6 w-px bg-hub-border mx-1 hidden md:block" />}

          {!detail.isCore && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onIsRemoveConfirmOpenChange(true)}
                className="h-9 px-2.5 md:px-4 border-hub-err/20 text-hub-err/60 hover:bg-hub-err/10 hover:text-hub-err hover:border-hub-err/40 transition-all"
              >
                <Trash2 className="size-3.5 md:mr-2" />
                <span className="hidden md:inline">Delete</span>
              </Button>
              <Button
                onClick={onSave}
                disabled={saving || !isDirty}
                className={`h-9 shadow-lg transition-all duration-300 px-2.5 md:px-5 font-semibold ${
                  !isDirty
                    ? "bg-hub-surface-3 text-hub-text-faint border border-hub-border opacity-50"
                    : "bg-hub-accent hover:bg-hub-accent/90 text-white shadow-hub-accent/20 hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {saving ? <Loader2 className="size-3.5 md:mr-2 animate-spin" /> : <Save className="size-3.5 md:mr-2" />}
                <span className="hidden md:inline">Save Changes</span>
              </Button>
            </>
          )}
        </div>
      </header>

      <div
        className={`grid grid-cols-1 ${detail.isCore ? "" : "md:grid-cols-2"} gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both items-start`}
      >
        {!detail.isCore && (
          <ViewContainer className="flex flex-col overflow-hidden group/editor p-0 border-hub-border/50">
            <div className="flex items-center justify-between px-4 py-2.5 bg-hub-surface-2/60 border-b border-hub-border group-focus-within/editor:border-hub-accent/30 transition-colors">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 mr-2">
                  <div className="size-2.5 rounded-full bg-hub-err/40" />
                  <div className="size-2.5 rounded-full bg-hub-warn/40" />
                  <div className="size-2.5 rounded-full bg-hub-user/40" />
                </div>
                <span className="text-[0.65rem] font-bold text-hub-text-dim truncate uppercase tracking-[0.15em]">
                  Source Code
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onFocusModeChange("editor")}
                          className="size-7 text-hub-text-faint hover:text-hub-accent hover:bg-hub-accent/10 transition-colors"
                        >
                          <Maximize2 className="size-3.5" />
                        </Button>
                      }
                    />
                    <TooltipContent>Focus Editor</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="relative flex flex-col group-focus-within/editor:bg-hub-surface-2/30 transition-colors">
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                disabled={detail.isCore}
                spellCheck={false}
                className="resize-none bg-transparent border-none focus-visible:ring-0 font-hub-mono text-[0.825rem] p-6 text-hub-text/90 leading-[1.6] placeholder:text-hub-text-faint/30 overflow-hidden min-h-[200px]"
                placeholder="# Enter content here..."
              />
              <div className="absolute bottom-3 right-3 opacity-0 group-hover/editor:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[0.6rem] font-medium text-hub-text-faint uppercase tracking-wider bg-hub-surface-3/80 backdrop-blur px-2 py-1 rounded border border-hub-border">
                  {draft.length} chars
                </span>
              </div>
            </div>
          </ViewContainer>
        )}

        <ViewContainer className="flex flex-col overflow-hidden group/preview min-h-[200px] p-0 border-hub-border/50">
          <div className="flex items-center justify-between px-4 py-2.5 bg-hub-surface-2/60 border-b border-hub-border">
            <div className="flex items-center gap-2">
              <Eye className="size-3.5 text-hub-accent" />
              <span className="text-[0.65rem] font-bold text-hub-text-dim truncate uppercase tracking-[0.15em]">
                Live Preview
              </span>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onFocusModeChange("preview")}
                        className="size-7 text-hub-text-faint hover:text-hub-accent hover:bg-hub-accent/10 transition-colors"
                      >
                        <Maximize2 className="size-3.5" />
                      </Button>
                    }
                  />
                  <TooltipContent>Focus Preview</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="relative bg-gradient-to-br from-transparent to-hub-accent/5">
            {draft.trim() ? (
              <MarkdownPreview
                content={draft}
                className="p-8 prose prose-invert prose-sm max-w-none animate-in fade-in duration-500 overflow-visible"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500 min-h-[200px]">
                <div className="size-12 rounded-full bg-hub-surface-3 flex items-center justify-center mb-4 ring-1 ring-white/5 shadow-xl">
                  <FileText className="size-6 text-hub-text-faint" />
                </div>
                <h3 className="text-hub-text font-bold text-sm mb-1">Nothing to preview</h3>
                <p className="text-hub-text-faint text-[0.75rem] max-w-[200px] leading-relaxed">
                  Start typing in the editor to see the live rendered preview here.
                </p>
              </div>
            )}
          </div>
        </ViewContainer>
      </div>

      {validation && (
        <ViewContainer className="p-4 space-y-2 border-hub-border/50">
          {validation.errors?.map((err, i) => (
            <div key={i} className="text-[0.75rem] text-hub-err flex items-center gap-2 uppercase font-bold">
              <AlertTriangle className="size-3" /> {err}
            </div>
          ))}
          {validation.warnings?.map((warn, i) => (
            <div key={i} className="text-[0.75rem] text-hub-warn flex items-center gap-2 uppercase font-bold">
              <AlertTriangle className="size-3" /> {warn}
            </div>
          ))}
          {!validation.errors?.length && !validation.warnings?.length && (
            <div className="text-[0.75rem] text-hub-success font-bold uppercase">Validation passed.</div>
          )}
        </ViewContainer>
      )}

      {focusMode && (
        <FocusModal
          open={!!focusMode}
          onOpenChange={(open) => !open && onFocusModeChange(null)}
          mode={focusMode}
          content={draft}
          onChange={onDraftChange}
          title={focusMode === "editor" ? `Edit ${selectedSlug}` : `Preview ${selectedSlug}`}
          readOnly={detail.isCore}
        />
      )}

      <ConfirmDialog
        open={isRemoveConfirmOpen}
        onOpenChange={onIsRemoveConfirmOpenChange}
        onConfirm={onRemove}
        title="Remove item?"
        description={`Are you sure you want to remove "${selectedSlug}"? This cannot be undone.`}
        confirmText="Remove"
        variant="destructive"
      />
    </div>
  )
}
