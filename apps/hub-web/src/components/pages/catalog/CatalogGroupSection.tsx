import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CatalogEntryResult } from '@/types';
import { resolveKindMeta } from '../library/asset-helpers';
import { catalogEntryKey } from './catalog-helpers';
import { CatalogEntryCard } from './CatalogEntryCard';

interface CatalogGroupSectionProps {
  groupKind: string;
  entries: CatalogEntryResult[];
  limit: number;
  compact: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onShowMore: (groupKind: string) => void;
  hasUpdate: (entry: CatalogEntryResult) => boolean;
  pageSize: number;
}

/** One kind-grouped block of the catalog grid with its "show more" paged limit. */
export function CatalogGroupSection({
  groupKind,
  entries,
  limit,
  compact,
  selectedKey,
  onSelect,
  onShowMore,
  hasUpdate,
  pageSize
}: CatalogGroupSectionProps) {
  const hidden = entries.length - limit;

  return (
    <section aria-label={`${resolveKindMeta(groupKind).label} entries`} className="grid min-w-0 gap-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {resolveKindMeta(groupKind).label}s · {entries.length}
      </h2>
      <div
        className={cn(
          'grid min-w-0 gap-3',
          compact ? 'grid-cols-1' : 'sm:grid-cols-2 2xl:grid-cols-3'
        )}
      >
        {entries.slice(0, limit).map((entry) => {
          const key = catalogEntryKey(entry);
          return (
            <CatalogEntryCard
              compact={compact}
              entry={entry}
              key={key}
              onSelect={() => onSelect(key)}
              selected={key === selectedKey}
              updateAvailable={hasUpdate(entry)}
            />
          );
        })}
      </div>
      {hidden > 0 ? (
        <Button className="justify-self-start" onClick={() => onShowMore(groupKind)} size="sm" variant="secondary">
          Show {Math.min(hidden, pageSize)} more
        </Button>
      ) : null}
    </section>
  );
}
