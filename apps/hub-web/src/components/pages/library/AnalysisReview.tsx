import { ScanSearch, Wrench } from 'lucide-react';

import { isEditableHubAsset } from '@chain-hub/contracts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AnalysisItem, AnalysisReport, AssetRecord } from '@/types';

import { AnalysisReviewRow } from './AnalysisReviewRow';
import { assetKey } from './use-analysis-review';

interface AnalysisReviewProps {
  report: AnalysisReport | null;
  assetsByKey: Map<string, AssetRecord>;
  selectedIds: ReadonlySet<string>;
  fixingId: string | null;
  batch: { current: number; total: number } | null;
  isAnalyzing: boolean;
  onToggleSelect: (id: string) => void;
  onSelectAllOpen: () => void;
  onOpenItem: (item: AnalysisItem) => void;
  onFixItem: (item: AnalysisItem) => void;
  onSetStatus: (item: AnalysisItem, status: 'open' | 'dismissed') => void;
  onApplySelected: () => void;
  onRunAgain: () => void;
}

export function AnalysisReview({
  report,
  assetsByKey,
  selectedIds,
  fixingId,
  batch,
  isAnalyzing,
  onToggleSelect,
  onSelectAllOpen,
  onOpenItem,
  onFixItem,
  onSetStatus,
  onApplySelected,
  onRunAgain
}: AnalysisReviewProps) {
  const items = report?.items ?? [];
  const open = items.filter((item) => item.status === 'open');
  const done = items.filter((item) => item.status === 'done');
  const dismissed = items.filter((item) => item.status === 'dismissed');
  const applying = batch !== null;

  return (
    <div className="grid min-h-0 gap-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1.5 text-xs">
        <span className="min-w-0 truncate text-muted-foreground">
          {report
            ? `Last run ${new Date(report.runAt).toLocaleString()} · ${open.length} open · ${report.totalAssets} checked`
            : 'No analysis yet'}
        </span>
        <Button
          className="h-6 shrink-0 gap-1 px-2 text-xs font-medium"
          disabled={isAnalyzing}
          onClick={onRunAgain}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ScanSearch className={cn('size-3', isAnalyzing && 'animate-pulse')} />
          {isAnalyzing ? 'Analyzing…' : 'Run analysis'}
        </Button>
      </div>

      {open.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button disabled={applying || selectedIds.size === 0} onClick={onApplySelected} size="sm" type="button">
            <Wrench className="size-4" />
            {applying ? `Applying ${batch.current}/${batch.total}…` : `Apply selected (${selectedIds.size})`}
          </Button>
          <Button
            className="h-8 px-2 text-xs"
            onClick={onSelectAllOpen}
            size="sm"
            type="button"
            variant="ghost"
          >
            Select all open
          </Button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {report ? 'Everything looks right — no findings.' : 'Run an analysis to build the worklist.'}
        </div>
      ) : (
        <>
          {[
            { title: 'Open', rows: open },
            { title: 'Done', rows: done },
            { title: 'Dismissed', rows: dismissed }
          ]
            .filter((section) => section.rows.length > 0)
            .map((section) => (
              <div className="grid gap-2" key={section.title}>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {section.title} ({section.rows.length})
                </h3>
                <ul className="grid gap-2">
                  {section.rows.map((item) => {
                    const record = assetsByKey.get(assetKey(item.kind, item.name));
                    return (
                      <AnalysisReviewRow
                        checked={selectedIds.has(item.id)}
                        editable={record ? isEditableHubAsset(record) : false}
                        isFixing={fixingId === item.id}
                        item={item}
                        key={item.id}
                        onFixItem={onFixItem}
                        onOpenItem={onOpenItem}
                        onSetStatus={onSetStatus}
                        onToggleSelect={onToggleSelect}
                      />
                    );
                  })}
                </ul>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
