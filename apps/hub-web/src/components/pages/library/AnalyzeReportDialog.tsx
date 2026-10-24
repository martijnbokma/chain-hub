import { ScanSearch } from 'lucide-react';

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
import type { AuditAssetResult } from '@/types';

import type { AnalysisEntry, AnalysisProgress } from './analyze-assets';
import type { AnalysisStatus } from './use-library-analysis';
import { KIND_META } from './asset-helpers';

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

function severityCounts(audit: AuditAssetResult): { high: number; medium: number; low: number } {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const finding of audit.findings) {
    counts[finding.severity] += 1;
  }
  return counts;
}

function hasCompatIssue(entry: AnalysisEntry): boolean {
  return (entry.asset.compatIssues?.length ?? 0) > 0;
}

function needsAttention(entry: AnalysisEntry): boolean {
  return (
    (entry.classification !== null && !entry.classification.matchesCurrent) ||
    (entry.audit !== null && entry.audit.findings.length > 0) ||
    hasCompatIssue(entry)
  );
}

function AnalysisRow({ entry, onOpenAsset }: { entry: AnalysisEntry; onOpenAsset: (entry: AnalysisEntry) => void }) {
  const { asset, classification, classifyError, audit, auditError } = entry;
  const kindLabel = KIND_META[asset.kind]?.label ?? asset.kind;
  const recommendedLabel = classification
    ? (KIND_META[classification.recommendedKind]?.label ?? classification.recommendedKind)
    : null;
  const counts = audit ? severityCounts(audit) : null;

  return (
    <li>
      <button
        className="block w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-left text-sm transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onOpenAsset(entry)}
        type="button"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0 truncate font-medium text-foreground">{asset.name}</span>
          <Badge variant="default">{kindLabel}</Badge>
          {classification && !classification.matchesCurrent ? (
            <Badge variant="accent">Suggests {recommendedLabel}</Badge>
          ) : null}
          {classification?.matchesCurrent ? <Badge variant="success">Kind OK</Badge> : null}
          {audit && audit.findings.length > 0 ? (
            <Badge variant="default">{audit.findings.length} findings</Badge>
          ) : null}
          {audit?.findings.length === 0 ? <Badge variant="success">Audit clean</Badge> : null}
          {hasCompatIssue(entry) ? <Badge variant="warning">Compat issue</Badge> : null}
          {classifyError || auditError ? <Badge variant="destructive">Failed</Badge> : null}
        </div>
        {classification && !classification.matchesCurrent ? (
          <p className="mt-1 leading-5 text-muted-foreground">{classification.reason}</p>
        ) : null}
        {counts && (counts.high > 0 || counts.medium > 0 || counts.low > 0) ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {[
              counts.high > 0 ? `${counts.high} high` : null,
              counts.medium > 0 ? `${counts.medium} medium` : null,
              counts.low > 0 ? `${counts.low} low` : null
            ]
              .filter(Boolean)
              .join(' · ')}
            {audit?.summary ? ` — ${audit.summary}` : ''}
          </p>
        ) : null}
        {asset.compatIssues?.map((issue) => (
          <p className="mt-1 text-xs leading-5 text-muted-foreground" key={issue.code}>
            {issue.severity === 'error' ? 'Compat' : 'Compat warning'} · {issue.message}
          </p>
        ))}
        {classifyError ? (
          <p className="mt-1 text-xs text-destructive">Kind check failed · {classifyError}</p>
        ) : null}
        {auditError ? <p className="mt-1 text-xs text-destructive">Audit failed · {auditError}</p> : null}
      </button>
    </li>
  );
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
