import { useEffect, useState } from 'react';
import { GitFork } from 'lucide-react';

import { normalizeSkillName } from '@chain-hub/contracts';
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
import type { AssetKind } from '@/types';

interface ForkAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: { kind: AssetKind; name: string } | null;
  /** Names already taken by assets of the same kind. */
  takenNames: Set<string>;
  onSubmit: (name: string) => void;
  onOpenExisting: (name: string) => void;
  isForking: boolean;
}

export function ForkAssetDialog({
  open,
  onOpenChange,
  selected,
  takenNames,
  onSubmit,
  onOpenExisting,
  isForking
}: ForkAssetDialogProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open && selected) {
      setName(`${selected.name}-local`);
    }
  }, [open, selected]);

  const normalized = normalizeSkillName(name);
  const sameAsSource = normalized !== '' && normalized === selected?.name;
  const taken = normalized !== '' && !sameAsSource && takenNames.has(normalized);
  const invalid = !normalized || sameAsSource || taken;

  function handleSubmit() {
    if (invalid || !selected) {
      return;
    }
    onSubmit(normalized);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fork to customize</DialogTitle>
          <DialogDescription>
            Copy {selected ? `${selected.kind}/${selected.name}` : 'this asset'} into an editable local asset. The
            upstream original keeps tracking its source; the fork is yours to change.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <label className="grid gap-2">
            <span className="text-sm text-muted-foreground">Fork name</span>
            <Input
              aria-label="Fork name"
              autoFocus
              disabled={isForking}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              value={name}
            />
          </label>
          {sameAsSource ? (
            <p className="text-xs text-destructive">The fork name must differ from the upstream name.</p>
          ) : null}
          {taken && selected ? (
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p>
                {selected.kind}/{normalized} already exists in the hub. It may be a fork you made earlier.
              </p>
              <Button
                className="mt-3"
                onClick={() => onOpenExisting(normalized)}
                size="sm"
                type="button"
                variant="secondary"
              >
                Open {selected.kind}/{normalized}
              </Button>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Cancel
          </Button>
          <Button disabled={invalid} loading={isForking} onClick={handleSubmit}>
            <GitFork className="size-4" />
            {isForking ? 'Forking…' : 'Create fork'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
