import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import type { AssetKind } from '@/types';

interface RemoveAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: { kind: AssetKind; name: string } | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function RemoveAssetDialog({ open, onOpenChange, selected, onConfirm, isDeleting }: RemoveAssetDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete asset</DialogTitle>
          <DialogDescription>
            This permanently deletes the file from the local hub and pushes the removal to every
            connected editor that supports this asset kind — it will disappear there too.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            {selected ? `${selected.kind}/${selected.name} will be permanently deleted everywhere.` : 'No asset is selected.'}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Cancel
          </Button>
          <Button disabled={!selected} loading={isDeleting} onClick={onConfirm} variant="destructive">
            {isDeleting ? 'Deleting…' : 'Confirm delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
