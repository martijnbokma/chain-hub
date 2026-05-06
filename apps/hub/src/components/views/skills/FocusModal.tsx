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
      <DialogContent className="max-w-[96vw] w-[96vw] sm:max-w-[96vw] h-[92vh] flex flex-col p-0 bg-hub-surface-2 border-hub-border-strong/20 shadow-2xl overflow-hidden gap-0 rounded-2xl transition-all">
        <DialogHeader className="px-6 py-4 border-b border-hub-border/50 bg-hub-surface-1/50 backdrop-blur-md space-y-0 flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-hub-accent/10 flex items-center justify-center border border-hub-accent/20">
              {mode === "editor" ? <FileText className="size-4 text-hub-accent" /> : <Eye className="size-4 text-hub-accent" />}
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-white text-sm font-hub-display font-bold tracking-tight">{title}</DialogTitle>
              <span className="text-[0.6rem] text-hub-text-faint uppercase font-bold tracking-widest leading-none">
                {mode === "editor" ? "Editing Mode" : "Preview Mode"}
              </span>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[#05070a]">
          {mode === "editor" ? (
            <Textarea
              value={content}
              onChange={(e) => onChange?.(e.target.value)}
              readOnly={readOnly}
              className="flex-1 resize-none bg-transparent border-none focus-visible:ring-0 font-mono text-[0.88rem] p-8 text-hub-text-dim hover:text-hub-text transition-colors leading-relaxed selection:bg-hub-accent/30"
              autoFocus
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-12 prose prose-invert prose-base max-w-7xl mx-auto w-full scroll-smooth">
              <MarkdownPreview content={content} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
