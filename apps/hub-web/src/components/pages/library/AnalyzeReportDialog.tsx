import { ScanSearch } from 'lucide-react';

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

import type { AnalysisEntry, AnalysisProgress } from './analyze-assets';
import type { AnalysisStatus } from './use-library-analysis';
import { AnalysisRow, needsAttention } from './AnalysisRow';

interface AnalyzeReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: AnalysisStatus;
  cancelled: boolean;
  progress: AnalysisProgress | null;
  entries: AnalysisEntry[];
  totalAssets: number;
  onRunAgain: () => void;
  onCancel: () => void;
  onOpenAsset: (entry: AnalysisEntry) => void;
}

function Section({
  title,
  entries,
  onOpenAsset
}: {
  title: string;
  entries: AnalysisEntry[];
  onOpenAsset: (entry: AnalysisEntry) => void;
}) {
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="grid gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} ({entries.length})
      </h3>
      <ul className="grid gap-2">
        {entries.map((entry) => (
          <AnalysisRow entry={entry} key={`${entry.asset.kind}/${entry.asset.name}`} onOpenAsset={onOpenAsset} />
        ))}
      </ul>
    </div>
  );
}

export function AnalyzeReportDialog({
  open,
  onOpenChange,
  status,
  cancelled,
  progress,
  entries,
  totalAssets,
  onRunAgain,
  onCancel,
  onOpenAsset
}: AnalyzeReportDialogProps) {
  const running = status === 'running';
  const attention = entries.filter((entry) => !entry.classifyError && needsAttention(entry));
  const failed = entries.filter((entry) => entry.classifyError !== null);
  const ok = entries.filter((entry) => !entry.classifyError && !needsAttention(entry));
  const progressPercent = progress ? Math.round((progress.current / Math.max(progress.total, 1)) * 100) : 0;

  const summary = running
    ? progress?.phase === 'audit'
      ? `Auditing flagged assets… ${progress.current}/${progress.total}`
      : `Checking kinds… ${progress?.current ?? 0}/${progress?.total ?? totalAssets}`
    : [
        `${entries.length} of ${totalAssets} checked`,
        attention.length > 0 ? `${attention.length} need attention` : 'all look right',
        failed.length > 0 ? `${failed.length} couldn't be checked` : null,
        cancelled ? 'stopped early' : null
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanSearch className="size-5 text-muted-foreground" />
            Library analysis
          </DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {running ? (
            <div aria-label="Analysis progress" className="grid gap-1.5" role="status">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {progress?.label ? (
                <p className="truncate text-xs text-muted-foreground">{progress.label}</p>
              ) : null}
            </div>
          ) : null}

          <Section entries={attention} onOpenAsset={onOpenAsset} title="Needs attention" />
          <Section entries={failed} onOpenAsset={onOpenAsset} title="Couldn't check" />
          <Section entries={ok} onOpenAsset={onOpenAsset} title="Looks right" />

          {!running && entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assets to analyze yet.</p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          {running ? (
            <Button onClick={onCancel} variant="secondary">
              Stop analysis
            </Button>
          ) : (
            <>
              <Button onClick={onRunAgain} variant="secondary">
                Run again
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
