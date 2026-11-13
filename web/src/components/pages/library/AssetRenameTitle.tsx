import { Check, Pencil, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface AssetRenameTitleProps {
  name: string;
  isRenamingUi: boolean;
  renameValue: string;
  isRenaming: boolean;
  canRename: boolean;
  onRenameValueChange: (value: string) => void;
  onStartRename: () => void;
  onSubmitRename: () => void;
  onCancelRename: () => void;
}

export function AssetRenameTitle({
  name,
  isRenamingUi,
  renameValue,
  isRenaming,
  canRename,
  onRenameValueChange,
  onStartRename,
  onSubmitRename,
  onCancelRename
}: AssetRenameTitleProps) {
  if (!isRenamingUi) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <CardTitle className="truncate">{name}</CardTitle>
        {canRename ? (
          <Button onClick={onStartRename} size="icon-sm" type="button" variant="ghost">
            <Pencil className="size-3.5" />
            <span className="sr-only">Rename asset</span>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Input
        aria-label="Asset name"
        autoFocus
        className="max-w-md font-mono text-sm"
        disabled={isRenaming}
        onChange={(event) => onRenameValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSubmitRename();
          }
          if (event.key === 'Escape') {
            onCancelRename();
          }
        }}
        value={renameValue}
      />
      <Button disabled={!renameValue.trim()} loading={isRenaming} onClick={onSubmitRename} size="icon-sm" type="button">
        <Check className="size-4" />
        <span className="sr-only">Save name</span>
      </Button>
      <Button
        disabled={isRenaming}
        onClick={onCancelRename}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <X className="size-4" />
        <span className="sr-only">Cancel rename</span>
      </Button>
    </div>
  );
}
