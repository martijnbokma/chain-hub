import { useState, useEffect, useMemo } from "react"
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
  ChevronUp,
  ChevronDown,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { MarkdownPreview } from "../skills/MarkdownPreview"
import { FocusModal } from "../skills/FocusModal"
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
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [detail, setDetail] = useState<ContentDetail | null>(null)
  const [draft, setDraft] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<{ errors?: string[], warnings?: string[] } | null>(null)
  const [showEditor, setShowEditor] = useState(true)
  const [showPreview, setShowPreview] = useState(true)
  const [focusMode, setFocusMode] = useState<"editor" | "preview" | null>(null)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newSlug, setNewSlug] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newExt, setNewExt] = useState(".md")
  const [creating, setCreating] = useState(false)

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
      setDraft(res.content)
      setValidation(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!detail || detail.isCore || !selectedSlug) return
    try {
      setSaving(true)
      const body: any = { content: draft }
      if (kind === "rules" && (detail.ext === ".md" || detail.ext === ".mdc")) {
        body.ext = detail.ext
      }
      await apiRequest(`/api/content/${kind}/${encodeURIComponent(selectedSlug)}`, {
        method: "PUT",
        body: JSON.stringify(body)
      })
      toast.success("Saved successfully.")
      setDetail({ ...detail, content: draft })
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
    if (!confirm(`Remove "${selectedSlug}"? This cannot be undone.`)) return
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
        body: JSON.stringify({ 
          slug: newSlug.trim(), 
          content, 
          ext: kind === "rules" ? newExt : undefined 
        })
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

  if (selectedSlug && detail) {
    return (
      <div className="flex flex-col h-full space-y-4">
        {detail.isCore && (
          <div className="p-2 px-3 text-[0.7rem] bg-hub-warn/10 text-hub-warn border border-hub-warn/20 rounded flex items-center gap-2">
            <AlertTriangle className="size-3.5" />
            Protected core asset: read-only.
          </div>
        )}

        <header className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedSlug(null); setDetail(null); }} className="h-8 px-2 text-hub-text-dim hover:text-white">
              <ArrowLeft className="size-4 mr-1.5" />
              {title}
            </Button>
            <span className="font-bold text-white text-lg">{selectedSlug}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleValidate} disabled={validating} className="h-8 border-hub-border-strong text-hub-text hover:text-white">
              <AlertTriangle className="size-3.5 mr-1.5" />
              Validate
            </Button>

            {!detail.isCore && (
              <>
                <Button variant="outline" size="sm" onClick={handleRemove} className="h-8 border-hub-err/30 text-hub-err/80 hover:bg-hub-err/10 hover:text-hub-err">
                  <Trash2 className="size-3.5 mr-1.5" />
                  Remove
                </Button>
                <Button onClick={handleSave} disabled={saving || draft === detail.content} className="h-8 bg-hub-accent hover:bg-hub-accent/90 text-white">
                  <Save className="size-3.5 mr-1.5" />
                  Save
                </Button>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`flex flex-col border border-hub-border rounded-lg bg-hub-surface-1 overflow-hidden ${!showEditor && "md:w-12 md:flex-none"}`}>
            <div className="flex items-center justify-between px-3 py-2 bg-hub-surface-2 border-b border-hub-border">
              <span className="text-[0.7rem] font-bold text-hub-text-dim truncate uppercase tracking-wider">Editor</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setFocusMode("editor")} className="size-6 text-hub-text-faint hover:text-white">
                  <Maximize2 className="size-3" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowEditor(!showEditor)} className="size-6 text-hub-text-faint hover:text-white">
                  {showEditor ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </Button>
              </div>
            </div>
            {showEditor && (
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={detail.isCore}
                className="flex-1 resize-none bg-transparent border-none focus-visible:ring-0 font-mono text-[0.8rem] p-4 text-hub-text-dim leading-relaxed"
              />
            )}
          </div>

          <div className={`flex flex-col border border-hub-border rounded-lg bg-hub-surface-1 overflow-hidden ${!showPreview && "md:w-12 md:flex-none"}`}>
            <div className="flex items-center justify-between px-3 py-2 bg-hub-surface-2 border-b border-hub-border">
              <span className="text-[0.7rem] font-bold text-hub-text-dim truncate uppercase tracking-wider">Preview</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setFocusMode("preview")} className="size-6 text-hub-text-faint hover:text-white">
                  <Maximize2 className="size-3" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowPreview(!showPreview)} className="size-6 text-hub-text-faint hover:text-white">
                  {showPreview ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </Button>
              </div>
            </div>
            {showPreview && (
              <MarkdownPreview content={draft} className="p-4 prose prose-invert prose-sm max-w-none" />
            )}
          </div>
        </div>

        {validation && (
          <div className="border border-hub-border rounded-lg bg-hub-surface-2 p-4 space-y-2">
            {validation.errors?.map((err, i) => <div key={i} className="text-[0.75rem] text-hub-err flex items-center gap-2 uppercase font-bold"><AlertTriangle className="size-3" /> {err}</div>)}
            {validation.warnings?.map((warn, i) => <div key={i} className="text-[0.75rem] text-hub-warn flex items-center gap-2 uppercase font-bold"><AlertTriangle className="size-3" /> {warn}</div>)}
            {!validation.errors?.length && !validation.warnings?.length && <div className="text-[0.75rem] text-hub-success font-bold uppercase">Validation passed.</div>}
          </div>
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
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-4 mb-4">
        <h1 className="m-0 font-hub-display text-[1.05rem] tracking-wide text-[#f5f8ff]">{title}</h1>
        <Button onClick={() => setIsNewModalOpen(true)} className="bg-hub-accent hover:bg-hub-accent/90 text-white h-9 gap-2">
          <Plus className="size-4" />
          New {kind.slice(0, -1)}
        </Button>
      </header>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[240px]">
          <label className="text-[0.66rem] tracking-wide text-hub-text-faint uppercase font-semibold">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-hub-text-faint" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${kind}...`}
              className="pl-9 h-9 bg-hub-surface-2 border-hub-border-strong text-hub-text"
            />
          </div>
        </div>
        {searchQuery && (
          <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="h-9 border-hub-border bg-hub-surface-2 text-hub-text-dim hover:text-white">
            <RotateCcw className="size-3.5 mr-2" /> Reset
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {filteredItems.map((item) => (
          <button
            key={item.slug}
            onClick={() => openItem(item.slug)}
            className="w-full text-left group flex items-center justify-between p-3 rounded-md border border-hub-border bg-hub-surface-1/50 hover:bg-hub-surface-2/80 hover:border-hub-border-strong transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <div className={`size-2 rounded-full ${item.isCore ? "bg-hub-core" : "bg-hub-user"}`} />
              <span className="text-[0.8rem] text-[#f2f6ff] group-hover:text-white font-medium">
                {item.slug}
              </span>
            </div>
            {item.isCore && (
              <Badge variant="outline" className="text-[0.6rem] h-4 border-hub-border text-hub-text-faint">
                core
              </Badge>
            )}
          </button>
        ))}

        {filteredItems.length === 0 && (
          <div className="p-8 text-center border border-dashed border-hub-border rounded-lg text-hub-text-dim text-sm">
            No {kind} found.
          </div>
        )}
      </div>

      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="bg-hub-surface-2 border-hub-border text-hub-text sm:max-w-[425px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-white font-hub-display">Create New {title.slice(0, -1)}</DialogTitle>
              <DialogDescription className="text-hub-text-dim text-[0.8rem]">
                Enter details for your new {kind.slice(0, -1)}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="slug" className="text-hub-text-faint text-[0.7rem] uppercase font-bold">Slug</Label>
                <Input id="slug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="item-slug" className="bg-hub-surface-1 border-hub-border-strong text-hub-text" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc" className="text-hub-text-faint text-[0.7rem] uppercase font-bold">Description (Optional)</Label>
                <Input id="desc" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Short description" className="bg-hub-surface-1 border-hub-border-strong text-hub-text" />
              </div>
              {kind === "rules" && (
                <div className="grid gap-2">
                  <Label htmlFor="ext" className="text-hub-text-faint text-[0.7rem] uppercase font-bold">Extension</Label>
                  <Input id="ext" value={newExt} onChange={(e) => setNewExt(e.target.value)} placeholder=".md" className="bg-hub-surface-1 border-hub-border-strong text-hub-text" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsNewModalOpen(false)} className="text-hub-text-dim hover:text-white">Cancel</Button>
              <Button type="submit" disabled={creating || !newSlug.trim()} className="bg-hub-accent hover:bg-hub-accent/90 text-white gap-2">
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
