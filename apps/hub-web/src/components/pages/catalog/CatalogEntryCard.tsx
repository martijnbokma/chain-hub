import { Star } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CatalogEntryResult } from '@/types';
import { resolveKindMeta } from '../library/asset-helpers';
import { CATALOG_CATEGORY_LABELS, formatStarCount } from './catalog-helpers';
import { useGithubStars } from './use-github-stars';

interface CatalogEntryCardProps {
  entry: CatalogEntryResult;
  selected: boolean;
  compact?: boolean;
  updateAvailable?: boolean;
  onSelect: () => void;
}

export function CatalogEntryCard({
  entry,
  selected,
  compact = false,
  updateAvailable = false,
  onSelect
}: CatalogEntryCardProps) {
  const meta = resolveKindMeta(entry.kind);
  const Icon = meta.icon;
  const stars = useGithubStars(entry.source.repo);

  return (
    <button
      aria-pressed={selected}
      className={cn(
        'group relative grid w-full min-w-0 rounded-xl border border-border bg-card text-left shadow-card transition-colors',
        'hover:bg-accent/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected && 'border-foreground/20 bg-accent',
        compact ? 'gap-2 p-3' : 'gap-3 p-4'
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors',
            selected && 'bg-background text-foreground'
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="grid min-w-0 flex-1 gap-1 overflow-hidden">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 truncate text-sm font-medium text-foreground">{entry.name}</span>
            <Badge variant="accent">{meta.label}</Badge>
            {entry.installed ? <Badge variant="success">Installed</Badge> : null}
            {updateAvailable ? <Badge variant="accent">Update available</Badge> : null}
          </div>
          <p className={cn('text-xs text-muted-foreground', compact ? 'truncate' : 'line-clamp-2')}>
            {entry.description}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{CATALOG_CATEGORY_LABELS[entry.category]}</span>
            {entry.author ? <span className="min-w-0 truncate">by {entry.author}</span> : null}
            {stars !== null ? (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star aria-hidden="true" className="size-3" />
                {formatStarCount(stars)}
                <span className="sr-only"> GitHub stars</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}
