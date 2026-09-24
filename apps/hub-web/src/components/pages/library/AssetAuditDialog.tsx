import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

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
import type { AuditAssetFinding, AuditAssetResult } from '@/types';

export type AssetAuditDialogProps = {
  audit: AuditAssetResult;
  activeFindingIndex: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFindingIndex: (index: number | null) => void;
  isUpstreamSkill: boolean;
  isImproving: boolean;
  canImprove: boolean;
  onImprove: () => void;
};

export function severityLabel(severity: AuditAssetFinding['severity']): string {
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

export function fieldReportsLabel(count: number): string {
  return count === 1 ? '1 field report' : `${count} field reports`;
}

export function AssetAuditDialog({
  audit,
  activeFindingIndex,
  open,
  onOpenChange,
  onSelectFindingIndex,
  isUpstreamSkill,
  isImproving,
  canImprove,
  onImprove
}: AssetAuditDialogProps) {
  const hasFindings = audit.findings.length > 0;
  const currentFinding =
    activeFindingIndex !== null && activeFindingIndex >= 0 && activeFindingIndex < audit.findings.length
      ? audit.findings[activeFindingIndex]
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Audit findings</DialogTitle>
            <Badge variant="default">{hasFindings ? `${audit.findings.length} findings` : 'No findings'}</Badge>
            {audit.learningsConsidered ? (
              <Badge variant="default">Checked against {fieldReportsLabel(audit.learningsConsidered)}</Badge>
            ) : null}
          </div>
          <DialogDescription className="text-foreground/80">{audit.summary}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          {currentFinding !== null && activeFindingIndex !== null ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => onSelectFindingIndex(null)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    View all findings
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Finding {activeFindingIndex + 1} of {audit.findings.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    aria-label="Previous finding"
                    disabled={activeFindingIndex === 0}
                    onClick={() => onSelectFindingIndex(activeFindingIndex - 1)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <Button
                    aria-label="Next finding"
                    disabled={activeFindingIndex === audit.findings.length - 1}
                    onClick={() => onSelectFindingIndex(activeFindingIndex + 1)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={currentFinding.severity === 'high' ? 'accent' : 'default'}>
                    {severityLabel(currentFinding.severity)}
                  </Badge>
                  {currentFinding.source === 'learning' ? (
                    <Badge variant="default">From learnings</Badge>
                  ) : (
                    <Badge variant="default">Best practice</Badge>
                  )}
                  <h3 className="text-base font-semibold text-foreground">{currentFinding.title}</h3>
                </div>
                <p className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap">{currentFinding.detail}</p>
                {currentFinding.source === 'learning' ? (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Field report:</span> This finding was detected from
                    captured learning events in Learnings.
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              {audit.findings.map((finding, index) => (
                <div
                  className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-foreground/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  key={`${finding.severity}-${finding.title}`}
                  onClick={() => onSelectFindingIndex(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectFindingIndex(index);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={finding.severity === 'high' ? 'accent' : 'default'}>
                        {severityLabel(finding.severity)}
                      </Badge>
                      {finding.source === 'learning' ? <Badge variant="default">From learnings</Badge> : null}
                      <span className="font-medium text-foreground">{finding.title}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      Details
                      <ChevronRight className="size-3.5" />
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-5">{finding.detail}</p>
                </div>
              ))}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {hasFindings ? (
            isUpstreamSkill ? (
              <p className="mr-auto text-xs text-muted-foreground leading-5">
                Fork this skill first if you want AI to apply improvements to a local copy.
              </p>
            ) : (
              <Button
                className="mr-auto"
                disabled={isImproving || !canImprove}
                onClick={onImprove}
                size="sm"
                type="button"
              >
                <Sparkles className="size-4" />
                {isImproving ? 'Improving…' : 'Apply improvements'}
              </Button>
            )
          ) : null}
          <Button onClick={() => onOpenChange(false)} size="sm" type="button" variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
