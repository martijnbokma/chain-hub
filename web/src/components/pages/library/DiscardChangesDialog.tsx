import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface DiscardChangesDialogProps {
  open: boolean;
  assetLabel: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function DiscardChangesDialog({ open, assetLabel, onKeepEditing, onDiscard }: DiscardChangesDialogProps) {
  return (
    <Dialog onOpenChange={(next) => (next ? undefined : onKeepEditing())} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
          <DialogDescription>
            You have edits in {assetLabel} that aren’t saved yet. If you leave now, they’re lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onKeepEditing} variant="secondary">
            Keep editing
          </Button>
          <Button onClick={onDiscard} variant="destructive">
            Discard changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
