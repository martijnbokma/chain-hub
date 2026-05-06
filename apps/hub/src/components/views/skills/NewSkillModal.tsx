import React, { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRequest } from "@/lib/api"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"

interface NewSkillModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (slug: string) => void
}

export function NewSkillModal({ open, onOpenChange, onSuccess }: NewSkillModalProps) {
  const [slug, setSlug] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug.trim()) return

    try {
      setLoading(true)
      await apiRequest("/api/skills", {
        method: "POST",
        body: { slug: slug.trim() }
      })
      toast.success(`Skill '${slug}' created successfully.`)
      onSuccess(slug.trim())
      onOpenChange(false)
      setSlug("")
    } catch (err: any) {
      toast.error(`Failed to create skill: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-hub-border sm:max-w-[440px] gap-0 p-0 overflow-hidden bg-hub-surface-2">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-white text-xl font-hub-display tracking-tight">Create New Skill</DialogTitle>
              <DialogDescription className="text-hub-text-dim text-[0.85rem] leading-relaxed">
                Enter a slug for your new skill. This will create a new directory and a SKILL.md file in your personal skills folder.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="slug" className="text-hub-text-faint text-[0.65rem] uppercase font-bold tracking-wider">
                  Skill Slug
                </Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                  placeholder="my-awesome-skill"
                  className="h-10 bg-hub-surface-1 border-hub-border-strong/50 focus:border-hub-accent/50 text-hub-text transition-colors"
                  autoFocus
                />
                <p className="text-[0.65rem] text-hub-text-faint italic px-1">
                  Only lowercase letters, numbers, hyphens and underscores.
                </p>
              </div>
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
              disabled={loading || !slug.trim()}
              className="bg-hub-accent hover:bg-hub-accent/90 text-white gap-2 shadow-lg shadow-hub-accent/20 px-6"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create Skill
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
