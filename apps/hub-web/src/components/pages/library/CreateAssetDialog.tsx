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
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AssetKind } from '@/types';

interface CreateAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  draftKind: AssetKind;
  onDraftKindChange: (value: AssetKind) => void;
  draftContent: string;
  onDraftContentChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function CreateAssetDialog({
  open,
  onOpenChange,
  draftName,
  onDraftNameChange,
  draftKind,
  onDraftKindChange,
  draftContent,
  onDraftContentChange,
  onSubmit,
  isSubmitting
}: CreateAssetDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create asset</DialogTitle>
          <DialogDescription>Add a new portable asset to the local hub without leaving the library workspace.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <label className="grid gap-2">
            <span className="text-sm text-muted-foreground">Name</span>
            <Input onChange={(event) => onDraftNameChange(event.target.value)} value={draftName} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-muted-foreground">Kind</span>
            <Select value={draftKind} onChange={(event) => onDraftKindChange(event.target.value as AssetKind)}>
              <option value="skills">skills</option>
              <option value="agents">agents</option>
              <option value="workflows">workflows</option>
              <option value="rules">rules</option>
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-muted-foreground">Content</span>
            <Textarea onChange={(event) => onDraftContentChange(event.target.value)} rows={12} value={draftContent} />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting || draftName.trim().length === 0} onClick={onSubmit}>
            {isSubmitting ? 'Creating…' : 'Create asset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
