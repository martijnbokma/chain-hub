import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface ContentCreateDialogProps {
  kind: "rules" | "agents" | "workflows"
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  newSlug: string
  onNewSlugChange: (value: string) => void
  newDescription: string
  onNewDescriptionChange: (value: string) => void
  newExt: string
  onNewExtChange: (value: string) => void
  creating: boolean
  onSubmit: (e: React.FormEvent) => void
}

export function ContentCreateDialog({
  kind,
  title,
  open,
  onOpenChange,
  newSlug,
  onNewSlugChange,
  newDescription,
  onNewDescriptionChange,
  newExt,
  onNewExtChange,
  creating,
  onSubmit,
}: ContentCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-hub-border sm:max-w-[440px] gap-0 p-0 overflow-hidden bg-hub-surface-2">
        <form onSubmit={onSubmit}>
          <div className="p-6 space-y-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-white text-xl font-hub-display tracking-tight">
                Create New {title.slice(0, -1)}
              </DialogTitle>
              <DialogDescription className="text-hub-text-dim text-[0.85rem] leading-relaxed">
                Enter details for your new {kind.slice(0, -1)}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="slug" className="text-hub-text-faint text-[0.65rem] uppercase font-bold tracking-wider">
                  Slug
                </Label>
                <Input
                  id="slug"
                  value={newSlug}
                  onChange={(e) => onNewSlugChange(e.target.value)}
                  placeholder="item-slug"
                  className="h-10 bg-hub-surface-1 border-hub-border-strong/50 focus:border-hub-accent/50 text-hub-text transition-colors"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc" className="text-hub-text-faint text-[0.65rem] uppercase font-bold tracking-wider">
                  Description (Optional)
                </Label>
                <Input
                  id="desc"
                  value={newDescription}
                  onChange={(e) => onNewDescriptionChange(e.target.value)}
                  placeholder="Short description"
                  className="h-10 bg-hub-surface-1 border-hub-border-strong/50 focus:border-hub-accent/50 text-hub-text transition-colors"
                />
              </div>
              {kind === "rules" && (
                <div className="grid gap-2">
                  <Label htmlFor="ext" className="text-hub-text-faint text-[0.65rem] uppercase font-bold tracking-wider">
                    Extension
                  </Label>
                  <Input
                    id="ext"
                    value={newExt}
                    onChange={(e) => onNewExtChange(e.target.value)}
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
              onClick={() => onOpenChange(false)}
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
  )
}
