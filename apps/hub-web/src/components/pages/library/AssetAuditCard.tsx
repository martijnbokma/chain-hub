import { Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AuditAssetFinding, AuditAssetResult } from '@/types';

type AssetAuditCardProps = {
  audit: AuditAssetResult;
  isUpstreamSkill: boolean;
  isImproving: boolean;
  canImprove: boolean;
  onImprove: () => void;
};

function severityLabel(severity: AuditAssetFinding['severity']): string {
  switch (severity) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default: {
      const _exhaustive: never = severity;
      return _exhaustive;
    }
  }
}

function fieldReportsLabel(count: number): string {
  return count === 1 ? '1 field report' : `${count} field reports`;
}

export function AssetAuditCard({ audit, isUpstreamSkill, isImproving, canImprove, onImprove }: AssetAuditCardProps) {
  const hasFindings = audit.findings.length > 0;
  const hasLearningFindings = audit.findings.some((finding) => finding.source === 'learning');

  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">Audit</span>
        <Badge variant="default">{hasFindings ? `${audit.findings.length} findings` : 'No findings'}</Badge>
      </div>
      <p className="mt-1 leading-5 text-foreground/80">{audit.summary}</p>
      {audit.learningsConsidered ? (
        <p className="mt-1 leading-5">Checked against {fieldReportsLabel(audit.learningsConsidered)} from Learnings.</p>
      ) : null}
      {hasFindings ? (
        <ul className="mt-3 grid gap-2">
          {audit.findings.map((finding) => (
            <li className="rounded-lg border border-border bg-card px-3 py-2" key={`${finding.severity}-${finding.title}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={finding.severity === 'high' ? 'accent' : 'default'}>{severityLabel(finding.severity)}</Badge>
                {finding.source === 'learning' ? <Badge variant="default">From learnings</Badge> : null}
                <span className="font-medium text-foreground">{finding.title}</span>
              </div>
              <p className="mt-1 leading-5 text-foreground/80">{finding.detail}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {hasFindings ? (
        isUpstreamSkill ? (
          <p className="mt-3 leading-5 text-foreground/80">
            {hasLearningFindings
              ? 'Fork this skill to apply improvements locally, or contribute the field-report findings to the upstream repo.'
              : 'Fork this skill first if you want AI to apply improvements to a local copy.'}
          </p>
        ) : (
          <Button className="mt-3 w-fit" disabled={isImproving || !canImprove} onClick={onImprove} size="sm" type="button">
            <Sparkles className="size-4" />
            {isImproving ? 'Improving…' : 'Apply improvements'}
          </Button>
        )
      ) : null}
    </div>
  );
}
