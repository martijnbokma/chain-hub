import { useState } from "react"
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
        body: JSON.stringify({ slug: slug.trim() })
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
      <DialogContent className="bg-hub-surface-2 border-hub-border text-hub-text sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white font-hub-display">Create New Skill</DialogTitle>
            <DialogDescription className="text-hub-text-dim text-[0.8rem]">
              Enter a slug for your new skill. This will create a new directory and a SKILL.md file in your personal skills folder.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="slug" className="text-hub-text-faint text-[0.7rem] uppercase font-bold">
                Skill Slug
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                placeholder="my-awesome-skill"
                className="bg-hub-surface-1 border-hub-border-strong text-hub-text h-10"
                autoFocus
              />
              <p className="text-[0.65rem] text-hub-text-faint italic">
                Only lowercase letters, numbers, hyphens and underscores.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="text-hub-text-dim hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !slug.trim()}
              className="bg-hub-accent hover:bg-hub-accent/90 text-white gap-2"
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
