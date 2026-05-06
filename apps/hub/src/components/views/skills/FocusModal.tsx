import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownPreview } from "./MarkdownPreview"
import { FileText, Eye } from "lucide-react"

interface FocusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "editor" | "preview"
  content: string
  onChange?: (content: string) => void
  title: string
  readOnly?: boolean
}

export function FocusModal({ 
  open, 
  onOpenChange, 
  mode, 
  content, 
  onChange, 
  title,
  readOnly = false
}: FocusModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 bg-hub-surface-2 border-hub-border overflow-hidden gap-0">
        <DialogHeader className="px-4 py-3 border-b border-hub-border space-y-0">
          <div className="flex items-center gap-2">
            {mode === "editor" ? <FileText className="size-4 text-hub-accent" /> : <Eye className="size-4 text-hub-accent" />}
            <DialogTitle className="text-white text-sm font-hub-display">{title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {mode === "editor" ? (
            <Textarea
              value={content}
              onChange={(e) => onChange?.(e.target.value)}
              readOnly={readOnly}
              className="flex-1 resize-none bg-transparent border-none focus-visible:ring-0 font-mono text-[0.9rem] p-6 text-hub-text leading-relaxed"
              autoFocus
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-8 prose prose-invert prose-base max-w-6xl mx-auto w-full">
              <MarkdownPreview content={content} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
