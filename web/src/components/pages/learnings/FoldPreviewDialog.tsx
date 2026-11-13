import { useState } from 'react';
import { diffLines } from 'diff';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
import { cn } from '@/lib/utils';
import type { FoldLearningsResult, FoldSkillOutcome, FoldSkillResult } from '@/types';

const OUTCOME_META: Record<FoldSkillOutcome, { label: string; variant: 'accent' | 'success' | 'warning' | 'destructive' | 'default'; hint: string }> = {
  applied: { label: 'Will be rewritten', variant: 'accent', hint: 'Apply writes the proposed SKILL.md in place.' },
  'reviewed-clean': { label: 'Nothing actionable', variant: 'success', hint: 'Audit reviewed the reports; applying marks them addressed.' },
  'upstream-proposal': { label: 'Upstream-locked', variant: 'warning', hint: 'Apply records the rewrite as a proposal under memory/learnings/folds.' },
  'to-source': { label: 'Writes to source', variant: 'warning', hint: 'Apply writes back into the upstream path source.' },
  'findings-only': { label: 'Too large to rewrite', variant: 'warning', hint: 'Skill exceeds the AI improve limit; findings are kept as an artifact.' },
  orphan: { label: 'Not in your hub', variant: 'default', hint: 'No skill exists for this slug — reports can only be marked addressed.' },
  failed: { label: 'Failed', variant: 'destructive', hint: '' }
};

function SkillDiff({ before, after }: { before: string; after: string }) {
  const parts = diffLines(before, after);
  const hasChanges = parts.some((part) => part.added || part.removed);
  if (!hasChanges) {
    return <p className="text-xs text-muted-foreground">No changes; the AI returned the same content.</p>;
  }
  return (
    <pre className="max-h-72 overflow-y-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs leading-5 whitespace-pre-wrap">
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
  );
}

function FoldItem({
  item,
  done,
  applying,
  onApply,
  onMarkAddressed
}: {
  item: FoldSkillResult;
  done: boolean;
  applying: boolean;
  onApply: (skill: string) => void;
  onMarkAddressed: (skill: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = OUTCOME_META[item.outcome];
  const canApply = !done && item.outcome !== 'orphan' && item.outcome !== 'failed';
  const hasDiff = Boolean(item.currentContent && item.proposedContent);

  return (
    <li className="grid gap-2 rounded-lg border border-border px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{item.skill}</span>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {item.findingCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              {item.findingCount} finding{item.findingCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasDiff ? (
            <Button aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} size="sm" variant="ghost">
              {expanded ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
              Diff
            </Button>
          ) : null}
          {item.outcome === 'orphan' && !done ? (
            <Button disabled={applying} onClick={() => onMarkAddressed(item.skill)} size="sm" variant="ghost">
              Mark addressed
            </Button>
          ) : null}
          {canApply ? (
            <Button disabled={applying} onClick={() => onApply(item.skill)} size="sm" variant="secondary">
              Apply
            </Button>
          ) : null}
          {done ? <span className="text-xs font-medium text-success-foreground">Done</span> : null}
        </div>
      </div>
      {meta.hint && !done ? <p className="text-xs text-muted-foreground">{meta.hint}</p> : null}
      {item.error ? <p className="text-xs text-destructive-foreground">{item.error}</p> : null}
      {item.findings.length > 0 ? (
        <ul className="grid gap-0.5">
          {item.findings.map((finding, index) => (
            <li className="text-xs leading-5 text-muted-foreground" key={index}>
              <span className="font-mono text-2xs text-foreground">[{finding.severity}]</span>{' '}
              {finding.title}: {finding.detail}
            </li>
          ))}
        </ul>
      ) : null}
      {expanded && hasDiff ? <SkillDiff after={item.proposedContent!} before={item.currentContent!} /> : null}
    </li>
  );
}

export function FoldPreviewDialog({
  open,
  onOpenChange,
  preview,
  doneSkills,
  applying,
  onApplySkill,
  onApplyAll,
  onMarkAddressed
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: FoldLearningsResult | null;
  doneSkills: ReadonlySet<string>;
  applying: boolean;
  onApplySkill: (skill: string) => void;
  onApplyAll: () => void;
  onMarkAddressed: (skill: string) => void;
}) {
  const remaining = (preview?.results ?? []).filter((item) => !doneSkills.has(item.skill));
  const applyable = remaining.filter((item) => item.outcome !== 'orphan' && item.outcome !== 'failed');

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Fold field reports into skills</DialogTitle>
          <DialogDescription>
            Dry-run preview; nothing is written yet. Apply rewrites the skill, records a fold artifact under
            memory/learnings/folds, and marks the reports addressed.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {preview && preview.results.length > 0 ? (
            <ul className="grid gap-2">
              {preview.results.map((item) => (
                <FoldItem
                  applying={applying}
                  done={doneSkills.has(item.skill)}
                  item={item}
                  key={item.skill}
                  onApply={onApplySkill}
                  onMarkAddressed={onMarkAddressed}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No open field reports; nothing to fold.</p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Close
          </Button>
          <Button disabled={applyable.length === 0 || applying} loading={applying} onClick={onApplyAll}>
            Apply all ({applyable.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
