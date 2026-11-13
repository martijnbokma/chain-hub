import { useEffect, useState } from 'react';
import { ChevronRight, Maximize2, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AuditAssetResult } from '@/types';

import { AssetAuditDialog, fieldReportsLabel, severityLabel } from './AssetAuditDialog';

type AssetAuditCardProps = {
  audit: AuditAssetResult | null;
  assetName?: string;
  isAuditing?: boolean;
  isUpstreamSkill: boolean;
  isImproving: boolean;
  canImprove: boolean;
  onImprove: () => void;
  defaultOpenModal?: boolean;
};

export function AssetAuditCard({
  audit,
  assetName,
  isAuditing = false,
  isUpstreamSkill,
  isImproving,
  canImprove,
  onImprove,
  defaultOpenModal = true
}: AssetAuditCardProps) {
  const hasFindings = Boolean(audit && audit.findings.length > 0);
  const hasLearningFindings = Boolean(audit?.findings.some((finding) => finding.source === 'learning'));

  const [isModalOpen, setIsModalOpen] = useState(
    (defaultOpenModal && (audit?.findings.length ?? 0) > 0) || isAuditing
  );
  const [activeFindingIndex, setActiveFindingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isAuditing) {
      setIsModalOpen(true);
      setActiveFindingIndex(null);
    }
  }, [isAuditing]);

  useEffect(() => {
    if (defaultOpenModal && audit && audit.findings.length > 0) {
      setIsModalOpen(true);
      setActiveFindingIndex(null);
    }
  }, [audit, defaultOpenModal]);

  if (!audit && !isAuditing) {
    return null;
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">Audit</span>
          {isAuditing ? (
            <Badge variant="accent">Auditing…</Badge>
          ) : (
            <>
              <Badge variant="default">{hasFindings ? `${audit?.findings.length} findings` : 'No findings'}</Badge>
              {hasFindings ? (
                <Button
                  className="ml-auto h-6 px-2 text-xs"
                  onClick={() => {
                    setActiveFindingIndex(null);
                    setIsModalOpen(true);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Maximize2 className="size-3.5" />
                  View in modal
                </Button>
              ) : null}
            </>
          )}
        </div>
        <p className="mt-1 leading-5 text-foreground/80">
          {isAuditing
            ? 'Evaluating content against field reports and quality standards…'
            : audit?.summary}
        </p>
        {!isAuditing && audit?.learningsConsidered ? (
          <p className="mt-1 leading-5">Checked against {fieldReportsLabel(audit.learningsConsidered)} from Learnings.</p>
        ) : null}
        {!isAuditing && hasFindings && audit ? (
          <ul className="mt-3 grid gap-2">
            {audit.findings.map((finding, index) => (
              <li
                className="group relative cursor-pointer rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={`${finding.severity}-${finding.title}`}
                onClick={() => {
                  setActiveFindingIndex(index);
                  setIsModalOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActiveFindingIndex(index);
                    setIsModalOpen(true);
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
                  <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                    Details
                    <ChevronRight className="size-3" />
                  </span>
                </div>
                <p className="mt-1 leading-5 text-foreground/80">{finding.detail}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {!isAuditing && hasFindings ? (
          isUpstreamSkill ? (
            <p className="mt-3 leading-5 text-foreground/80">
              {hasLearningFindings
                ? 'Fork this skill to apply improvements locally, or contribute the field-report findings to the upstream repo.'
                : 'Fork this skill first if you want AI to apply improvements to a local copy.'}
            </p>
          ) : (
            <Button
              className="mt-3 w-fit"
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
      </div>

      <AssetAuditDialog
        activeFindingIndex={activeFindingIndex}
        assetName={assetName}
        audit={audit}
        canImprove={canImprove}
        isImproving={isImproving}
        isLoading={isAuditing}
        isUpstreamSkill={isUpstreamSkill}
        onImprove={onImprove}
        onOpenChange={setIsModalOpen}
        onSelectFindingIndex={setActiveFindingIndex}
        open={isModalOpen}
      />
    </>
  );
}
