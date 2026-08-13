import { useMemo } from 'react';
import { diffLines } from 'diff';

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
import { cn } from '@/lib/utils';

export interface PendingAiEdit {
  label: string;
  before: string;
  after: string;
}

interface AiEditPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingEdit: PendingAiEdit | null;
  onApprove: () => void;
  onDiscard: () => void;
}

export function AiEditPreviewDialog({ open, onOpenChange, pendingEdit, onApprove, onDiscard }: AiEditPreviewDialogProps) {
  const parts = useMemo(
    () => (pendingEdit ? diffLines(pendingEdit.before, pendingEdit.after) : []),
    [pendingEdit]
  );
  const hasChanges = parts.some((part) => part.added || part.removed);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{pendingEdit?.label ?? 'Review AI edit'}</DialogTitle>
          <DialogDescription>
            Nothing is applied yet — approve to load this into the editor, then save to persist it.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {hasChanges ? (
            <pre className="max-h-96 overflow-y-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs leading-5 whitespace-pre-wrap">
              {parts.map((part, index) => (
                <span
                  key={index}
                  className={cn(
                    'block',
                    part.added && 'bg-success/10 text-success-foreground',
                    part.removed && 'bg-destructive/10 text-destructive-foreground line-through'
                  )}
                >
                  {part.value}
                </span>
              ))}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">No changes — the AI returned the same content.</p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={onDiscard} variant="secondary">
            Discard
          </Button>
          <Button disabled={!hasChanges} onClick={onApprove}>
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
