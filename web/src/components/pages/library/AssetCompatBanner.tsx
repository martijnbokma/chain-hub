import { GitFork, Sparkles, Wrench } from 'lucide-react';

import type { listAssetCompatIssues } from '@chain-hub/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type CompatIssue = ReturnType<typeof listAssetCompatIssues>[number];

interface AssetCompatBannerProps {
  issue: CompatIssue;
  isUpstreamSkill: boolean;
  isForkingAndFixingHeading: boolean;
  isForkingAndFixingWithAi: boolean;
  isFixingDescriptionWithAi: boolean;
  onForkAndFixHeading: () => void;
  onForkAndFixWithAi: () => void;
  onFixFromHeading: () => void;
  onFixDescriptionWithAi: () => void;
}

/** Blocking editor-compat banner (e.g. missing description for Zed) with fix actions. */
export function AssetCompatBanner({
  issue,
  isUpstreamSkill,
  isForkingAndFixingHeading,
  isForkingAndFixingWithAi,
  isFixingDescriptionWithAi,
  onForkAndFixHeading,
  onForkAndFixWithAi,
  onFixFromHeading,
  onFixDescriptionWithAi
}: AssetCompatBannerProps) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">Editor compatibility</span>
        <Badge variant="warning">Missing description</Badge>
      </div>
      <p className="mt-1 leading-5 text-foreground/80">{issue.message}</p>
      {isUpstreamSkill ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            loading={isForkingAndFixingHeading}
            onClick={onForkAndFixHeading}
            size="sm"
            type="button"
            variant="secondary"
          >
            <GitFork className="size-4" />
            {isForkingAndFixingHeading ? 'Forking…' : 'Fork & fix from heading'}
          </Button>
          <Button loading={isForkingAndFixingWithAi} onClick={onForkAndFixWithAi} size="sm" type="button">
            <GitFork className="size-4" />
            {isForkingAndFixingWithAi ? 'Forking…' : 'Fork & fix with AI'}
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={onFixFromHeading} size="sm" type="button" variant="secondary">
            <Wrench className="size-4" />
            Fix from heading
          </Button>
          <Button
            loading={isFixingDescriptionWithAi}
            onClick={onFixDescriptionWithAi}
            size="sm"
            type="button"
          >
            <Sparkles className="size-4" />
            {isFixingDescriptionWithAi ? 'Drafting…' : 'Fix with AI'}
          </Button>
        </div>
      )}
    </div>
  );
}
