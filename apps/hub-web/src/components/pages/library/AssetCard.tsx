import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types';
import { formatSkillSource, formatSkillSourceType, resolveKindMeta } from './asset-helpers';

interface AssetCardProps {
  asset: AssetRecord;
  selected: boolean;
  compact?: boolean;
  onSelect: () => void;
}

export function AssetCard({ asset, selected, compact = false, onSelect }: AssetCardProps) {
  const meta = resolveKindMeta(asset.kind);
  const Icon = meta.icon;
  const sourceLabel =
    asset.kind === 'skills' ? formatSkillSource(asset.provenance) : null;

  return (
    <button
      className={cn(
        'group grid w-full gap-3 rounded-xl border border-border bg-card text-left shadow-card transition-colors',
        'hover:border-primary/25 hover:bg-muted/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected && 'border-primary/40 bg-primary/5 ring-1 ring-primary/15',
        compact ? 'gap-2 p-3' : 'p-4'
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors',
            selected && 'bg-primary/10 text-primary'
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{asset.name}</span>
            <Badge variant="accent">{meta.label}</Badge>
            {asset.kind === 'skills' ? (
              <Badge variant="default">{formatSkillSourceType(asset.provenance)}</Badge>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{asset.relativePath}</p>
          {sourceLabel ? (
            <p className="truncate text-xs text-muted-foreground" title={sourceLabel}>
              Source · {sourceLabel}
            </p>
          ) : null}
          {compact ? null : (
            <p className="text-xs text-muted-foreground">
              Updated {new Date(asset.updatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        {compact ? (
          <time
            className="shrink-0 font-mono text-2xs tabular-nums text-muted-foreground"
            dateTime={asset.updatedAt}
          >
            {new Date(asset.updatedAt).toLocaleDateString()}
          </time>
        ) : null}
      </div>
    </button>
  );
}
