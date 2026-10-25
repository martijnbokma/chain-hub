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
  onImportAll: (candidates: DiscoveredAsset[]) => void;
  isCandidateImporting: (candidate: DiscoveredAsset) => boolean;
  isImportingAll?: boolean;
  importProgress?: { current: number; total: number } | null;
}

export function DiscoverDialog({
  open,
  onOpenChange,
  isLoading,
  groupedDiscovered,
  onImport,
  onImportAll,
  isCandidateImporting,
  isImportingAll = false,
  importProgress = null
}: DiscoverDialogProps) {
  const groups = Object.entries(groupedDiscovered);
  const allCandidates = groups.flatMap(([, candidates]) => candidates);

  const importAllLabel = isImportingAll
    ? importProgress
      ? `Importing (${importProgress.current}/${importProgress.total})…`
      : 'Importing…'
    : `Import all (${allCandidates.length})`;

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
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {allCandidates.length} unmanaged asset{allCandidates.length === 1 ? '' : 's'} found
                  </span>
                  {groups.length > 1 ? (
                    <span className="text-xs text-muted-foreground">
                      across {groups.length} editors
                    </span>
                  ) : null}
                </div>
                <Button
                  className="w-full shrink-0 sm:w-auto"
                  loading={isImportingAll}
                  onClick={() => onImportAll(allCandidates)}
                  size="sm"
                >
                  {importAllLabel}
                </Button>
              </div>

              {groups.map(([editorLabel, candidates]) => (
                <div className="grid gap-2" key={editorLabel}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{editorLabel}</h3>
                      <Badge>{candidates.length}</Badge>
                    </div>
                    {groups.length > 1 && candidates.length > 1 ? (
                      <Button
                        loading={isImportingAll}
                        onClick={() => onImportAll(candidates)}
                        size="sm"
                        variant="secondary"
                      >
                        Import from {editorLabel}
                      </Button>
                    ) : null}
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
                            loading={isImportingThis && !isImportingAll}
                            onClick={() => onImport(candidate)}
                            size="sm"
                          >
                            {isImportingThis && !isImportingAll ? 'Importing…' : 'Import'}
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
          {allCandidates.length > 0 ? (
            <Button
              loading={isImportingAll}
              onClick={() => onImportAll(allCandidates)}
            >
              {importAllLabel}
            </Button>
          ) : null}
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
