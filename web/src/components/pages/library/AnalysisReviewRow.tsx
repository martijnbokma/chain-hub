import { Wrench } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { AnalysisItem } from '@/types';

import { KIND_META } from './asset-helpers';

const TYPE_LABEL: Record<AnalysisItem['type'], string> = {
  'kind-mismatch': 'Kind mismatch',
  'audit-findings': 'Audit findings',
  'compat-issue': 'Compat issue',
  'check-failed': 'Check failed'
};

function itemDetail(item: AnalysisItem): string | null {
  if (item.type === 'kind-mismatch' && item.recommendedKind) {
    return `Reads like a ${KIND_META[item.recommendedKind].label.toLowerCase()}: ${item.reason ?? ''}`;
  }
  if (item.type === 'audit-findings') {
    return item.summary ?? null;
  }
  if (item.type === 'compat-issue') {
    return item.compatIssues?.map((issue) => issue.message).join(' · ') ?? null;
  }
  return item.error ?? null;
}

function fixLabel(item: AnalysisItem): string | null {
  if (item.type === 'kind-mismatch' && item.recommendedKind) {
    return `Convert to ${KIND_META[item.recommendedKind].label}`;
  }
  if (item.type === 'compat-issue') {
    return 'Fix description';
  }
  if (item.type === 'audit-findings') {
    return 'Improve with AI';
  }
  return null;
}

export function AnalysisReviewRow({
  item,
  editable,
  checked,
  isFixing,
  onToggleSelect,
  onOpenItem,
  onFixItem,
  onSetStatus
}: {
  item: AnalysisItem;
  editable: boolean;
  checked: boolean;
  isFixing: boolean;
  onToggleSelect: (id: string) => void;
  onOpenItem: (item: AnalysisItem) => void;
  onFixItem: (item: AnalysisItem) => void;
  onSetStatus: (item: AnalysisItem, status: 'open' | 'dismissed') => void;
}) {
  const detail = itemDetail(item);
  const action = fixLabel(item);
  const open = item.status === 'open';

  return (
    <li
      className={cn(
        'rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm',
        !open && 'opacity-60'
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {open ? (
          <Checkbox
            aria-label={`Select ${item.name}`}
            checked={checked}
            className="mt-0.5"
            onCheckedChange={() => onToggleSelect(item.id)}
          />
        ) : null}
        <button
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          onClick={() => onOpenItem(item)}
          type="button"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 truncate font-medium text-foreground">{item.name}</span>
            <Badge variant="default">{KIND_META[item.kind].label}</Badge>
            <Badge variant={item.type === 'kind-mismatch' ? 'accent' : item.type === 'check-failed' ? 'destructive' : 'default'}>
              {TYPE_LABEL[item.type]}
            </Badge>
            {item.status === 'done' ? <Badge variant="success">Done</Badge> : null}
            {item.status === 'dismissed' ? <Badge variant="default">Dismissed</Badge> : null}
            {item.type === 'audit-findings' && item.findings ? (
              <Badge variant="default">{item.findings.length} findings</Badge>
            ) : null}
            {!editable && open ? <Badge variant="default">Upstream</Badge> : null}
          </div>
          {detail ? <p className="mt-1 leading-5 text-muted-foreground">{detail}</p> : null}
        </button>
      </div>
      {open ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
          {action ? (
            <Button
              disabled={isFixing || !editable}
              onClick={() => onFixItem(item)}
              size="sm"
              type="button"
              variant="secondary"
            >
              <Wrench className="size-3.5" />
              {isFixing ? 'Working…' : action}
            </Button>
          ) : null}
          <Button
            className="h-7 px-2 text-xs"
            onClick={() => onSetStatus(item, 'dismissed')}
            size="sm"
            type="button"
            variant="ghost"
          >
            Dismiss
          </Button>
        </div>
      ) : (
        <div className="mt-2 pl-7">
          <Button
            className="h-7 px-2 text-xs"
            onClick={() => onSetStatus(item, 'open')}
            size="sm"
            type="button"
            variant="ghost"
          >
            Reopen
          </Button>
        </div>
      )}
    </li>
  );
}
