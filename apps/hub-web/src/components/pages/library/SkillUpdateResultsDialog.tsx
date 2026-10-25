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
import type { SkillBatchItemResult } from '@/types';

interface SkillUpdateResultsDialogProps {
  results: SkillBatchItemResult[] | null;
  onOpenChange: (open: boolean) => void;
}

const STATUS_META: Record<SkillBatchItemResult['status'], { label: string; variant: 'success' | 'default' | 'destructive' }> = {
  updated: { label: 'Updated', variant: 'success' },
  migrated: { label: 'Migrated', variant: 'success' },
  skipped: { label: 'Up to date', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' }
};

function shortSha(sha: string | null | undefined): string {
  return sha ? sha.slice(0, 7) : 'unknown';
}

export function SkillUpdateResultsDialog({ results, onOpenChange }: SkillUpdateResultsDialogProps) {
  const items = results ?? [];
  const updated = items.filter((item) => item.status === 'updated' || item.status === 'migrated').length;
  const failed = items.filter((item) => item.status === 'failed').length;
  const upToDate = items.filter((item) => item.status === 'skipped').length;

  const summary = [
    `${updated} updated`,
    `${upToDate} up to date`,
    failed > 0 ? `${failed} failed` : null
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Dialog onOpenChange={onOpenChange} open={results !== null}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Skill update summary</DialogTitle>
          <DialogDescription>
            {items.length} checked · {summary}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ul className="grid gap-2">
            {items.map((item) => {
              const meta = STATUS_META[item.status];
              const newSha = item.lockEntry?.commitSha;
              const showSha = (item.status === 'updated' || item.status === 'migrated') && (item.previousCommitSha || newSha);
              return (
                <li
                  className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm"
                  key={item.name}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="min-w-0 truncate font-medium text-foreground">{item.name}</span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  {showSha ? (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {shortSha(item.previousCommitSha)} → {shortSha(newSha)}
                    </p>
                  ) : null}
                  {item.lockEntry?.source ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground" title={item.lockEntry.source}>
                      Source · {item.lockEntry.source}
                    </p>
                  ) : null}
                  {item.error ? <p className="mt-1 text-xs text-destructive">{item.error}</p> : null}
                </li>
              );
            })}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
