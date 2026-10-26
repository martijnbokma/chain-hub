import { Badge } from '@/components/ui/badge';
import type { AuditAssetResult } from '@/types';

import type { AnalysisEntry } from './analyze-assets';
import { KIND_META } from './asset-helpers';

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

export function needsAttention(entry: AnalysisEntry): boolean {
  return (
    (entry.classification !== null && !entry.classification.matchesCurrent) ||
    (entry.audit !== null && entry.audit.findings.length > 0) ||
    hasCompatIssue(entry)
  );
}

export function AnalysisRow({ entry, onOpenAsset }: { entry: AnalysisEntry; onOpenAsset: (entry: AnalysisEntry) => void }) {
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
