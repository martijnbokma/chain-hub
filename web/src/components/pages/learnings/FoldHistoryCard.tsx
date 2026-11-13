import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { learningsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import type { FoldArtifactSummary, FoldSkillOutcome } from '@/types';

const VISIBLE_FOLD_COUNT = 8;

const OUTCOME_VARIANT: Record<FoldSkillOutcome, 'accent' | 'success' | 'warning' | 'destructive' | 'default'> = {
  applied: 'accent',
  'reviewed-clean': 'success',
  'upstream-proposal': 'warning',
  'to-source': 'warning',
  'findings-only': 'warning',
  orphan: 'default',
  failed: 'destructive'
};

/** Read-only history of written fold artifacts under memory/learnings/folds/. */
export function FoldHistoryCard() {
  const [selected, setSelected] = useState<FoldArtifactSummary | null>(null);
  const [expanded, setExpanded] = useState(false);

  const folds = useQuery({
    queryKey: queryKeys.learningsFolds,
    queryFn: () => learningsApi.getFolds()
  });

  const artifact = useQuery({
    queryKey: [...queryKeys.learningsFolds, selected?.date, selected?.skill],
    queryFn: () => learningsApi.getFold(selected!.date, selected!.skill),
    enabled: selected !== null
  });

  const items = folds.data ?? [];
  if (folds.isLoading || items.length === 0) {
    return null;
  }

  const hasMore = items.length > VISIBLE_FOLD_COUNT;
  const visible = expanded ? items : items.slice(0, VISIBLE_FOLD_COUNT);

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>Fold history</CardTitle>
          <p className="text-xs text-muted-foreground">
            Audit trail of applied folds — findings, folded reports and before/after per skill. Read-only;
            revert by copying the Before block back into the skill.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <ul className="grid gap-2">
            {visible.map((item) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                key={`${item.date}/${item.skill}`}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{item.skill}</span>
                  <Badge variant={OUTCOME_VARIANT[item.outcome] ?? 'default'}>{item.outcome}</Badge>
                  <span className="text-xs text-muted-foreground">{item.date}</span>
                  {item.writtenTo ? (
                    <span className="truncate text-xs text-muted-foreground">→ {item.writtenTo}</span>
                  ) : null}
                </div>
                <Button onClick={() => setSelected(item)} size="sm" variant="ghost">
                  View
                </Button>
              </li>
            ))}
          </ul>
          {hasMore ? (
            <Button
              aria-expanded={expanded}
              className="w-full"
              onClick={() => setExpanded((value) => !value)}
              size="sm"
              variant="ghost"
            >
              {expanded ? 'Show fewer' : `Show all ${items.length} folds`}
              <ChevronDown
                aria-hidden="true"
                className={cn('size-3.5 transition-transform', expanded ? 'rotate-180' : '')}
              />
            </Button>
          ) : null}
        </div>
      </CardContent>
      <Dialog onOpenChange={(open) => !open && setSelected(null)} open={selected !== null}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.skill} · {selected?.date}
            </DialogTitle>
            <DialogDescription>Fold artifact, read-only review.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {artifact.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : artifact.isError ? (
              <p className="text-sm text-destructive-foreground">Unable to load the artifact.</p>
            ) : (
              <pre className="max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs leading-5 whitespace-pre-wrap">
                {artifact.data?.content}
              </pre>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
