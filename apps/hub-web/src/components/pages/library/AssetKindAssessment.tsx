import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ClassifyAssetResult } from '@/types';

interface AssetKindAssessmentProps {
  assessment: ClassifyAssetResult;
  recommendedLabel: string | null;
  canConvert: boolean;
  isConverting: boolean;
  isUpstreamSkill: boolean;
  onConvert: () => void;
}

/** "Kind check" card: whether the AI classifier thinks the asset has the right kind. */
export function AssetKindAssessment({
  assessment,
  recommendedLabel,
  canConvert,
  isConverting,
  isUpstreamSkill,
  onConvert
}: AssetKindAssessmentProps) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">Kind check</span>
        <Badge variant={assessment.matchesCurrent ? 'default' : 'accent'}>
          {assessment.matchesCurrent ? 'Matches' : `Suggests ${recommendedLabel}`}
        </Badge>
      </div>
      <p className="mt-1 leading-5 text-foreground/80">{assessment.reason}</p>
      {canConvert ? (
        <Button
          className="mt-3 w-fit"
          loading={isConverting}
          onClick={onConvert}
          size="sm"
          type="button"
        >
          {isConverting ? 'Converting…' : `Convert to ${assessment.recommendedKind}`}
        </Button>
      ) : null}
      {isUpstreamSkill && !assessment.matchesCurrent ? (
        <p className="mt-2 leading-5 text-foreground/80">
          Fork this skill first if you want to convert a customized copy.
        </p>
      ) : null}
    </div>
  );
}
