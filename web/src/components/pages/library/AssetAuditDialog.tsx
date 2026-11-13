import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

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
import { CircularLoader } from '@/components/ui/loader';
import type { AuditAssetFinding, AuditAssetResult } from '@/types';

export type AssetAuditDialogProps = {
  audit: AuditAssetResult | null;
  isLoading?: boolean;
  assetName?: string;
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

function SeverityBadge({ severity }: { severity: AuditAssetFinding['severity'] }) {
  return <Badge variant={severity === 'high' ? 'accent' : 'default'}>{severityLabel(severity)}</Badge>;
}

export function AssetAuditDialog({
  audit,
  isLoading = false,
  assetName,
  activeFindingIndex,
  open,
  onOpenChange,
  onSelectFindingIndex,
  isUpstreamSkill,
  isImproving,
  canImprove,
  onImprove
}: AssetAuditDialogProps) {
  const hasFindings = Boolean(audit && audit.findings.length > 0);
  const currentFinding =
    !isLoading && audit && activeFindingIndex !== null && activeFindingIndex >= 0 && activeFindingIndex < audit.findings.length
      ? audit.findings[activeFindingIndex]
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>
              {isLoading ? (assetName ? `Auditing ${assetName}` : 'Auditing asset') : 'Audit findings'}
            </DialogTitle>
            {isLoading ? (
              <Badge variant="accent">Auditing…</Badge>
            ) : (
              <>
                <Badge variant="default">{hasFindings ? `${audit?.findings.length} findings` : 'No findings'}</Badge>
                {audit?.learningsConsidered ? (
                  <Badge variant="default">Checked against {fieldReportsLabel(audit.learningsConsidered)}</Badge>
                ) : null}
              </>
            )}
          </div>
          <DialogDescription className="text-foreground/80">
            {isLoading
              ? 'Evaluating content against field reports from Learnings and quality standards…'
              : audit?.summary}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <CircularLoader size="lg" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {assetName ? `Auditing ${assetName}…` : 'Auditing asset…'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Checking content against field reports and best practice rules
                </p>
              </div>
            </div>
          ) : currentFinding !== null && activeFindingIndex !== null && audit ? (
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
                  <SeverityBadge severity={currentFinding.severity} />
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
          ) : hasFindings && audit ? (
            <div className="grid gap-2">
              {audit.findings.map((finding, index) => (
                <button
                  className="flex w-full flex-col gap-1.5 rounded-lg border border-border bg-card p-3.5 text-left hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  key={`${finding.severity}-${finding.title}`}
                  onClick={() => onSelectFindingIndex(index)}
                  type="button"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={finding.severity} />
                      {finding.source === 'learning' ? <Badge variant="default">From learnings</Badge> : null}
                      <span className="font-medium text-foreground">{finding.title}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      Details
                      <ChevronRight className="size-3.5" />
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-5">{finding.detail}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <div className="rounded-full bg-success/10 p-3 text-success">
                <Check className="size-5" />
              </div>
              <p className="text-sm font-medium text-foreground">No material findings</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                This asset meets quality standards and addresses checked field reports.
              </p>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {!isLoading && hasFindings ? (
            isUpstreamSkill ? (
              <p className="mr-auto text-xs text-muted-foreground leading-5">
                Fork this skill first if you want AI to apply improvements to a local copy.
              </p>
            ) : (
              <Button
                className="mr-auto"
                disabled={!canImprove}
                loading={isImproving}
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
