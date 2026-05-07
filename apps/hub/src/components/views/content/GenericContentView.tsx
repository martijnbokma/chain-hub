import React, { useState, useEffect, useMemo, useRef } from "react"
import { apiRequest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  Search, 
  RotateCcw, 
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
  X
} from "lucide-react"
import { toast } from "sonner"
import { MarkdownPreview } from "../skills/MarkdownPreview"
import { FocusModal } from "../skills/FocusModal"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ViewHeader } from "@/components/layout/ViewHeader"
import { ViewContainer } from "@/components/layout/ViewContainer"

interface ContentItem {
  slug: string
  isCore: boolean
  description?: string
}

interface ContentDetail {
  slug: string
  content: string
  isCore: boolean
  ext?: string
}

interface GenericContentViewProps {
  kind: "rules" | "agents" | "workflows"
  title: string
}

export function GenericContentView({ kind, title }: GenericContentViewProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [detail, setDetail] = useState<ContentDetail | null>(null)
  const [draft, setDraft] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<{ errors?: string[], warnings?: string[] } | null>(null)
  const [focusMode, setFocusMode] = useState<"editor" | "preview" | null>(null)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newSlug, setNewSlug] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newExt, setNewExt] = useState(".md")
  const [creating, setCreating] = useState(false)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
  const [isEditingSlug, setIsEditingSlug] = useState(false)
  const [slugDraft, setSlugDraft] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [draft, selectedSlug])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const data = await apiRequest<{ items: ContentItem[] }>(`/api/content/${kind}`)
      setItems(data.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [kind])

  const openItem = async (slug: string) => {
    try {
      setLoading(true)
      const res = await apiRequest<ContentDetail>(`/api/content/${kind}/${encodeURIComponent(slug)}`)
      setDetail(res)
      setSelectedSlug(slug)
      setSlugDraft(slug)
      setDraft(res.content)
      setValidation(null)
      setIsEditingSlug(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!detail || detail.isCore || !selectedSlug) return
    const slugChanged = slugDraft !== selectedSlug && slugDraft.trim().length > 0
    try {
      setSaving(true)
      const body: any = { content: draft }
      if (slugChanged) {
        body.newSlug = slugDraft.trim()
      }
      if (kind === "rules" && (detail.ext === ".md" || detail.ext === ".mdc")) {
        body.ext = detail.ext
      }
      await apiRequest(`/api/content/${kind}/${encodeURIComponent(selectedSlug)}`, {
        method: "PUT",
        body
      })
      toast.success("Saved successfully.")
      
      const newSlug = slugChanged ? slugDraft.trim() : selectedSlug
      setDetail({ ...detail, content: draft, slug: newSlug })
      setSelectedSlug(newSlug)
      setIsEditingSlug(false)
      fetchItems()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    if (!selectedSlug) return
    try {
      setValidating(true)
      const res = await apiRequest<{ errors?: string[], warnings?: string[] }>(
        `/api/content/${kind}/${encodeURIComponent(selectedSlug)}/validate`,
        { method: "POST" }
      )
      setValidation(res)
      if (res.errors && res.errors.length > 0) {
        toast.error("Validation failed")
      } else if (res.warnings && res.warnings.length > 0) {
        toast.warning("Validation passed with warnings")
      } else {
        toast.success("Validation passed")
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setValidating(false)
    }
  }

  const handleRemove = async () => {
    if (!selectedSlug || !detail || detail.isCore) return
    try {
      await apiRequest(`/api/content/${kind}/${encodeURIComponent(selectedSlug)}`, { method: "DELETE" })
      toast.success("Removed.")
      setSelectedSlug(null)
      setDetail(null)
      fetchItems()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSlug.trim()) return
    try {
      setCreating(true)
      let content = ""
      if (newDescription.trim()) {
        content = `---\nname: ${newSlug}\ndescription: ${newDescription}\n---\n`
      }
      await apiRequest(`/api/content/${kind}`, {
        method: "POST",
        body: { 
          slug: newSlug.trim(), 
          content, 
          ext: kind === "rules" ? newExt : undefined 
        }
      })
      toast.success("Created successfully.")
      setIsNewModalOpen(false)
      setNewSlug("")
      setNewDescription("")
      fetchItems()
      openItem(newSlug.trim())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return items
    return items.filter(item => item.slug.toLowerCase().includes(query))
  }, [items, searchQuery])

  if (!mounted) return <div className="p-8 flex items-center justify-center min-h-[400px]"><Loader2 className="size-8 animate-spin text-hub-accent/40" /></div>

  if (selectedSlug && detail) {
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
              onClick={() => { setSelectedSlug(null); setDetail(null); }} 
              className="h-9 w-9 p-0 rounded-full bg-hub-surface-2 hover:bg-hub-surface-3 border border-hub-border transition-all duration-300"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[0.65rem] uppercase font-bold tracking-[0.1em] text-hub-text-faint">{title}</span>
                {detail.isCore && <Badge className="h-4 px-1.5 text-[0.6rem] bg-hub-accent/10 text-hub-accent border-hub-accent/20">CORE</Badge>}
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
                      if (e.key === "Escape") { setSlugDraft(selectedSlug || ""); setIsEditingSlug(false); }
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingSlug(false)} className="size-8 text-hub-success hover:bg-hub-success/10">
                    <Check className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setSlugDraft(selectedSlug || ""); setIsEditingSlug(false); }} className="size-8 text-hub-err hover:bg-hub-err/10">
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

          <div className="flex items-center gap-2.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleValidate} 
                      disabled={validating} 
                      className="h-9 px-2.5 md:px-3 border-hub-border-strong/40 bg-hub-surface-2/50 backdrop-blur-sm text-hub-text hover:text-white hover:border-hub-border-strong transition-all"
                    >
                      {validating ? <Loader2 className="size-3.5 md:mr-2 animate-spin" /> : <AlertTriangle className="size-3.5 md:mr-2" />}
                      <span className="hidden md:inline">Validate</span>
                    </Button>
                  }
                />
                <TooltipContent>Run static analysis on this rule</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {!detail.isCore && (
              <div className="h-6 w-px bg-hub-border mx-1 hidden md:block" />
            )}

            {!detail.isCore && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsRemoveConfirmOpen(true)} 
                  className="h-9 px-2.5 md:px-4 border-hub-err/20 text-hub-err/60 hover:bg-hub-err/10 hover:text-hub-err hover:border-hub-err/40 transition-all"
                >
                  <Trash2 className="size-3.5 md:mr-2" />
                  <span className="hidden md:inline">Delete</span>
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || (draft === detail.content && slugDraft === selectedSlug)} 
                  className={`h-9 shadow-lg transition-all duration-300 px-2.5 md:px-5 font-semibold ${
                    (draft === detail.content && slugDraft === selectedSlug)
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

        <div className={`grid grid-cols-1 ${detail.isCore ? "" : "md:grid-cols-2"} gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both items-start`}>
          {!detail.isCore && (
            <ViewContainer className="flex flex-col overflow-hidden group/editor p-0 border-hub-border/50">
              <div className="flex items-center justify-between px-4 py-2.5 bg-hub-surface-2/60 border-b border-hub-border group-focus-within/editor:border-hub-accent/30 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 mr-2">
                    <div className="size-2.5 rounded-full bg-hub-err/40" />
                    <div className="size-2.5 rounded-full bg-hub-warn/40" />
                    <div className="size-2.5 rounded-full bg-hub-user/40" />
                  </div>
                  <span className="text-[0.65rem] font-bold text-hub-text-dim truncate uppercase tracking-[0.15em]">Source Code</span>
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setFocusMode("editor")} 
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
                  onChange={(e) => setDraft(e.target.value)}
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
                <span className="text-[0.65rem] font-bold text-hub-text-dim truncate uppercase tracking-[0.15em]">Live Preview</span>
              </div>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setFocusMode("preview")} 
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
                <MarkdownPreview content={draft} className="p-8 prose prose-invert prose-sm max-w-none animate-in fade-in duration-500 overflow-visible" />
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
            {validation.errors?.map((err, i) => <div key={i} className="text-[0.75rem] text-hub-err flex items-center gap-2 uppercase font-bold"><AlertTriangle className="size-3" /> {err}</div>)}
            {validation.warnings?.map((warn, i) => <div key={i} className="text-[0.75rem] text-hub-warn flex items-center gap-2 uppercase font-bold"><AlertTriangle className="size-3" /> {warn}</div>)}
            {!validation.errors?.length && !validation.warnings?.length && <div className="text-[0.75rem] text-hub-success font-bold uppercase">Validation passed.</div>}
          </ViewContainer>
        )}

        {focusMode && (
          <FocusModal
            open={!!focusMode}
            onOpenChange={(open) => !open && setFocusMode(null)}
            mode={focusMode}
            content={draft}
            onChange={setDraft}
            title={focusMode === "editor" ? `Edit ${selectedSlug}` : `Preview ${selectedSlug}`}
            readOnly={detail.isCore}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ViewHeader 
        title={title} 
        description={`Manage and edit your ${kind} library.`}
      >
        <Button onClick={() => setIsNewModalOpen(true)} className="bg-hub-accent hover:bg-hub-accent/90 text-white h-10 px-6 gap-2 shadow-lg shadow-hub-accent/20 hover:scale-[1.02] transition-all font-semibold">
          <Plus className="size-4" />
          New {kind.slice(0, -1)}
        </Button>
      </ViewHeader>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[240px]">
          <label className="text-[0.66rem] tracking-wide text-hub-text-faint uppercase font-semibold pl-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-hub-text-faint" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${kind}...`}
              className="pl-10 h-11 bg-hub-surface-1/60 border-hub-border text-hub-text focus:border-hub-accent/50 transition-all"
            />
          </div>
        </div>
        {searchQuery && (
          <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="h-11 border-hub-border bg-hub-surface-2 text-hub-text-dim hover:text-white px-4">
            <RotateCcw className="size-3.5 mr-2" /> Reset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
        {filteredItems.map((item) => (
          <button
            key={item.slug}
            onClick={() => openItem(item.slug)}
            className="group relative flex flex-col p-5 rounded-xl border border-hub-border bg-hub-surface-1/40 hover:bg-hub-surface-2/80 hover:border-hub-accent/40 hover:shadow-xl hover:shadow-hub-accent/5 transition-all duration-300 text-left overflow-hidden ring-1 ring-white/5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`size-2.5 rounded-full ${item.isCore ? "bg-hub-core shadow-[0_0_8px_rgba(139,124,255,0.5)]" : "bg-hub-user shadow-[0_0_8px_rgba(78,224,161,0.5)]"}`} />
              {item.isCore && (
                <Badge variant="outline" className="text-[0.6rem] h-4 border-hub-border text-hub-text-faint bg-white/5 uppercase tracking-wider font-bold px-1.5">
                  core
                </Badge>
              )}
            </div>
            <span className="text-[1rem] text-[#f2f6ff] group-hover:text-white font-bold truncate mb-1.5">
              {item.slug}
            </span>
            <p className="text-[0.75rem] text-hub-text-faint line-clamp-2 leading-relaxed min-h-[2.4rem]">
              {item.description || "No description provided."}
            </p>
            
            <div className="absolute bottom-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0 transition-transform">
              <ArrowLeft className="size-4 rotate-180 text-hub-accent" />
            </div>
          </button>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full p-12 text-center border border-dashed border-hub-border rounded-xl bg-hub-surface-1/20 text-hub-text-dim text-sm">
            No {kind} found.
          </div>
        )}
      </div>

      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="border-hub-border sm:max-w-[440px] gap-0 p-0 overflow-hidden bg-hub-surface-2">
          <form onSubmit={handleCreate}>
            <div className="p-6 space-y-6">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-white text-xl font-hub-display tracking-tight">Create New {title.slice(0, -1)}</DialogTitle>
                <DialogDescription className="text-hub-text-dim text-[0.85rem] leading-relaxed">
                  Enter details for your new {kind.slice(0, -1)}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="slug" className="text-hub-text-faint text-[0.65rem] uppercase font-bold tracking-wider">Slug</Label>
                  <Input 
                    id="slug" 
                    value={newSlug} 
                    onChange={(e) => setNewSlug(e.target.value)} 
                    placeholder="item-slug" 
                    className="h-10 bg-hub-surface-1 border-hub-border-strong/50 focus:border-hub-accent/50 text-hub-text transition-colors" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc" className="text-hub-text-faint text-[0.65rem] uppercase font-bold tracking-wider">Description (Optional)</Label>
                  <Input 
                    id="desc" 
                    value={newDescription} 
                    onChange={(e) => setNewDescription(e.target.value)} 
                    placeholder="Short description" 
                    className="h-10 bg-hub-surface-1 border-hub-border-strong/50 focus:border-hub-accent/50 text-hub-text transition-colors" 
                  />
                </div>
                {kind === "rules" && (
                  <div className="grid gap-2">
                    <Label htmlFor="ext" className="text-hub-text-faint text-[0.65rem] uppercase font-bold tracking-wider">Extension</Label>
                    <Input 
                      id="ext" 
                      value={newExt} 
                      onChange={(e) => setNewExt(e.target.value)} 
                      placeholder=".md" 
                      className="h-10 bg-hub-surface-1 border-hub-border-strong/50 focus:border-hub-accent/50 text-hub-text transition-colors" 
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="bg-hub-surface-3/50 px-6 py-4 border-t border-hub-border flex items-center justify-between sm:justify-between gap-4 -mx-0 -mb-0 rounded-none">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsNewModalOpen(false)} 
                className="text-hub-text-dim hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={creating || !newSlug.trim()} 
                className="bg-hub-accent hover:bg-hub-accent/90 text-white gap-2 shadow-lg shadow-hub-accent/20 px-6"
              >
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={isRemoveConfirmOpen}
        onOpenChange={setIsRemoveConfirmOpen}
        onConfirm={handleRemove}
        title={`Remove ${kind.slice(0, -1)}?`}
        description={`Are you sure you want to remove "${selectedSlug}"? This cannot be undone.`}
        confirmText="Remove"
        variant="destructive"
      />
    </div>
  )
}
