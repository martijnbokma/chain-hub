import * as React from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2 } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-hub-surface-2 border-hub-border">
        <div className="p-6 space-y-4">
          <DialogHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className={`shrink-0 size-10 rounded-full flex items-center justify-center ${variant === "destructive" ? "bg-hub-err/10" : "bg-hub-accent/10"}`}>
              <AlertTriangle className={`size-5 ${variant === "destructive" ? "text-hub-err" : "text-hub-accent"}`} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-white text-lg font-hub-display tracking-tight">{title}</DialogTitle>
              <DialogDescription className="text-hub-text-dim text-[0.85rem] leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <DialogFooter className="bg-hub-surface-3/50 px-6 py-4 border-t border-hub-border flex items-center justify-between sm:justify-between gap-4 -mx-0 -mb-0 rounded-none">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-hub-text-dim hover:text-white hover:bg-white/5 transition-all"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isLoading}
            className={`gap-2 shadow-lg px-6 ${
              variant === "destructive" 
                ? "bg-hub-err hover:bg-hub-err/90 text-white shadow-hub-err/20" 
                : "bg-hub-accent hover:bg-hub-accent/90 text-white shadow-hub-accent/20"
            }`}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
