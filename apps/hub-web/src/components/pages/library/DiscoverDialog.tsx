import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import type { DiscoveredAsset } from '@/types';

interface DiscoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  groupedDiscovered: Record<string, DiscoveredAsset[]>;
  onImport: (candidate: DiscoveredAsset) => void;
  isCandidateImporting: (candidate: DiscoveredAsset) => boolean;
}

export function DiscoverDialog({
  open,
  onOpenChange,
  isLoading,
  groupedDiscovered,
  onImport,
  isCandidateImporting
}: DiscoverDialogProps) {
  const groups = Object.entries(groupedDiscovered);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Discover</DialogTitle>
          <DialogDescription>
            Assets that exist in a linked editor but are not yet in the hub. Importing copies them in and keeps them in sync
            everywhere from now on.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {isLoading ? (
            <div aria-busy="true" aria-label="Scanning editors" className="grid gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : groups.length > 0 ? (
            <div className="grid gap-5">
              {groups.map(([editorLabel, candidates]) => (
                <div className="grid gap-2" key={editorLabel}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">{editorLabel}</h3>
                    <Badge>{candidates.length}</Badge>
                  </div>
                  <ul className="overflow-hidden rounded-2xl border border-border">
                    {candidates.map((candidate) => {
                      const isImportingThis = isCandidateImporting(candidate);
                      return (
                        <li
                          className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3 py-3 last:border-b-0"
                          key={`${candidate.editorId}-${candidate.kind}-${candidate.name}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-sm font-medium text-foreground">{candidate.name}</strong>
                              <Badge variant="accent">{candidate.kind}</Badge>
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{candidate.preview}</p>
                          </div>
                          <Button
                            className="w-fit shrink-0"
                            disabled={isImportingThis}
                            onClick={() => onImport(candidate)}
                            size="sm"
                          >
                            {isImportingThis ? 'Importing…' : 'Import'}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              Nothing to import — every native asset in your linked editors is already tracked by the hub.
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
