import React, { useState, useEffect, useMemo } from "react"
import { apiRequest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, RotateCcw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ViewHeader } from "@/components/layout/ViewHeader"
import { ContentCard } from "./ContentCard"
import { ContentDetailPanel } from "./ContentDetailPanel"
import { ContentCreateDialog } from "./ContentCreateDialog"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface SavePayload {
  content: string
  newSlug?: string
  ext?: string
}

interface GenericContentViewProps {
  kind: "rules" | "agents" | "workflows"
  title: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GenericContentView({ kind, title }: GenericContentViewProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // List state
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Detail state
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [detail, setDetail] = useState<ContentDetail | null>(null)
  const [draft, setDraft] = useState("")
  const [slugDraft, setSlugDraft] = useState("")
  const [isEditingSlug, setIsEditingSlug] = useState(false)

  // Operation state
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<{ errors?: string[]; warnings?: string[] } | null>(null)
  const [focusMode, setFocusMode] = useState<"editor" | "preview" | null>(null)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)

  // Create dialog state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newSlug, setNewSlug] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newExt, setNewExt] = useState(".md")
  const [creating, setCreating] = useState(false)

  // ---------------------------------------------------------------------------
  // API calls
  // ---------------------------------------------------------------------------

  const fetchItems = async () => {
    try {
      setLoading(true)
      const data = await apiRequest<{ items: ContentItem[] }>(`/api/content/${kind}`)
      setItems(data.items)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!detail || detail.isCore || !selectedSlug) return
    const slugChanged = slugDraft !== selectedSlug && slugDraft.trim().length > 0
    try {
      setSaving(true)
      const body: SavePayload = { content: draft }
      if (slugChanged) {
        body.newSlug = slugDraft.trim()
      }
      if (kind === "rules" && (detail.ext === ".md" || detail.ext === ".mdc")) {
        body.ext = detail.ext
      }
      await apiRequest(`/api/content/${kind}/${encodeURIComponent(selectedSlug)}`, {
        method: "PUT",
        body,
      })
      toast.success("Saved successfully.")
      const effectiveSlug = slugChanged ? slugDraft.trim() : selectedSlug
      setDetail({ ...detail, content: draft, slug: effectiveSlug })
      setSelectedSlug(effectiveSlug)
      setIsEditingSlug(false)
      fetchItems()
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    if (!selectedSlug) return
    try {
      setValidating(true)
      const res = await apiRequest<{ errors?: string[]; warnings?: string[] }>(
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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
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
          ext: kind === "rules" ? newExt : undefined,
        },
      })
      toast.success("Created successfully.")
      setIsNewModalOpen(false)
      setNewSlug("")
      setNewDescription("")
      fetchItems()
      openItem(newSlug.trim())
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return items
    return items.filter((item) => item.slug.toLowerCase().includes(query))
  }, [items, searchQuery])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!mounted) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-hub-accent/40" />
      </div>
    )
  }

  if (selectedSlug && detail) {
    return (
      <ContentDetailPanel
        title={title}
        kind={kind}
        selectedSlug={selectedSlug}
        detail={detail}
        draft={draft}
        onDraftChange={setDraft}
        slugDraft={slugDraft}
        onSlugDraftChange={setSlugDraft}
        isEditingSlug={isEditingSlug}
        onIsEditingSlugChange={setIsEditingSlug}
        saving={saving}
        validating={validating}
        validation={validation}
        focusMode={focusMode}
        onFocusModeChange={setFocusMode}
        isRemoveConfirmOpen={isRemoveConfirmOpen}
        onIsRemoveConfirmOpenChange={setIsRemoveConfirmOpen}
        onBack={() => { setSelectedSlug(null); setDetail(null) }}
        onSave={handleSave}
        onValidate={handleValidate}
        onRemove={handleRemove}
      />
    )
  }

  return (
    <div className="space-y-6">
      <ViewHeader
        title={title}
        description={`Manage and edit your ${kind} library.`}
      >
        <Button
          onClick={() => setIsNewModalOpen(true)}
          className="bg-hub-accent hover:bg-hub-accent/90 text-white h-10 px-6 gap-2 shadow-lg shadow-hub-accent/20 hover:scale-[1.02] transition-all font-semibold"
        >
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="h-11 border-hub-border bg-hub-surface-2 text-hub-text-dim hover:text-white px-4"
          >
            <RotateCcw className="size-3.5 mr-2" /> Reset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
        {filteredItems.map((item) => (
          <ContentCard key={item.slug} item={item} onClick={openItem} />
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full p-12 text-center border border-dashed border-hub-border rounded-xl bg-hub-surface-1/20 text-hub-text-dim text-sm">
            No {kind} found.
          </div>
        )}
      </div>

      <ContentCreateDialog
        kind={kind}
        title={title}
        open={isNewModalOpen}
        onOpenChange={setIsNewModalOpen}
        newSlug={newSlug}
        onNewSlugChange={setNewSlug}
        newDescription={newDescription}
        onNewDescriptionChange={setNewDescription}
        newExt={newExt}
        onNewExtChange={setNewExt}
        creating={creating}
        onSubmit={handleCreate}
      />
    </div>
  )
}
