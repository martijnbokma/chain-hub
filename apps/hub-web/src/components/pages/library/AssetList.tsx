import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AssetKind, AssetRecord, FilterKind } from '@/types';
import { AssetCard } from './AssetCard';

interface AssetListProps {
  kindSections: [string, AssetRecord[]][];
  filterKind: FilterKind;
  selected: { kind: AssetKind; name: string } | null;
  onSelect: (asset: AssetRecord) => void;
}

export function AssetList({ kindSections, filterKind, selected, onSelect }: AssetListProps) {
  if (kindSections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No assets match the current search and filter.
      </div>
    );
  }

  return (
    <div className="grid gap-6 pb-2">
      {kindSections.length > 1 && filterKind === '__all__' ? (
        <div className="flex flex-wrap gap-2">
          {kindSections.map(([kind, items]) => (
            <Button
              className="h-7 gap-1.5 px-2.5 capitalize"
              key={kind}
              onClick={() => {
                document
                  .getElementById(`library-kind-${kind}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              {kind}
              <span className="tabular-nums text-muted-foreground">{items.length}</span>
            </Button>
          ))}
        </div>
      ) : null}
      {kindSections.map(([kind, items]) => (
        <section className="grid gap-3" id={`library-kind-${kind}`} key={kind}>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold capitalize text-foreground">{kind}</h3>
            <Badge variant="default">{items.length}</Badge>
          </div>
          <div className={cn('grid gap-3', selected ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3')}>
            {items.map((asset) => (
              <AssetCard
                asset={asset}
                compact={Boolean(selected)}
                key={`${asset.kind}-${asset.name}`}
                onSelect={() => onSelect(asset)}
                selected={selected?.kind === asset.kind && selected?.name === asset.name}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
