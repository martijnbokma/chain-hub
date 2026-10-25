import { RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AssetKind, SkillLockEntry } from '@/types';
import { formatSkillSource, formatSkillSourceType } from './asset-helpers';

interface AssetProvenanceCardProps {
  kind: AssetKind;
  provenance: SkillLockEntry | null | undefined;
  isUpstreamSkill: boolean;
  updateAvailable: boolean;
  upstreamBrowseUrl: string | null;
  onRetryCheck?: () => void;
  isRetryingCheck?: boolean;
  onRelink?: () => void;
  onUnlink?: () => void;
  isUnlinking?: boolean;
}

export function AssetProvenanceCard({
  kind,
  provenance,
  isUpstreamSkill,
  updateAvailable,
  upstreamBrowseUrl,
  onRetryCheck,
  isRetryingCheck = false,
  onRelink,
  onUnlink,
  isUnlinking = false
}: AssetProvenanceCardProps) {
  if (kind !== 'skills' && !provenance) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">Source</span>
        <Badge variant="default">{formatSkillSourceType(provenance)}</Badge>
        {isUpstreamSkill ? <Badge variant="default">Upstream-owned</Badge> : null}
        {updateAvailable ? <Badge variant="accent">Update available</Badge> : null}
        {provenance?.unlinkedAt ? (
          <Badge variant="warning">
            {provenance.unlinkedReason === 'source-missing' ? 'Source gone' : 'Unlinked'}
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 break-all font-mono leading-5 text-foreground/80">
        {formatSkillSource(provenance)}
      </p>
      {provenance?.sourceType === 'path' ? (
        <p className="mt-1 leading-5">
          This source is a folder on disk, so there is no remote repository or owner to link to.
        </p>
      ) : null}
      {provenance?.subdir ? (
        <p className="mt-1">
          Subdir · <span className="font-mono">{provenance.subdir}</span>
        </p>
      ) : null}
      {provenance?.updatedAt ? (
        <p className="mt-1">Locked · {new Date(provenance.updatedAt).toLocaleString()}</p>
      ) : null}
      {provenance?.lastCheckedAt ? (
        <p className="mt-1">Checked · {new Date(provenance.lastCheckedAt).toLocaleString()}</p>
      ) : null}
      {provenance?.unlinkedAt ? (
        <p className="mt-2 leading-5 text-foreground/80">
          Unlinked · {new Date(provenance.unlinkedAt).toLocaleString()}
          {provenance.unlinkedReason === 'source-missing'
            ? ' — this source no longer exists. The copy below is now editable; reinstall from a new source to track it again.'
            : ' — detached from source. The copy below is now editable; reinstall to track it again.'}
        </p>
      ) : null}
      {provenance?.lastCheckError || provenance?.lastUpdateError ? (
        <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-2">
          {provenance.lastCheckError ? (
            <p className="text-xs leading-5 text-destructive">Check failed · {provenance.lastCheckError}</p>
          ) : null}
          {provenance.lastUpdateError ? (
            <p className="text-xs leading-5 text-destructive">Update failed · {provenance.lastUpdateError}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {onRetryCheck ? (
              <Button loading={isRetryingCheck} onClick={onRetryCheck} size="sm" type="button" variant="secondary">
                <RefreshCw className="size-3.5" />
                Retry check
              </Button>
            ) : null}
            {onRelink && kind === 'skills' && provenance.sourceType === 'git' ? (
              <Button onClick={onRelink} size="sm" type="button" variant="secondary">
                Relink…
              </Button>
            ) : null}
            {onUnlink ? (
              <Button loading={isUnlinking} onClick={onUnlink} size="sm" type="button" variant="ghost">
                Unlink
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      {isUpstreamSkill ? (
        <p className="mt-2 leading-5 text-foreground/80">
          Updates from source overwrite this copy. Fork to customize locally.
          {upstreamBrowseUrl
            ? ' To propose changes upstream, open a PR in the source repo — Hub does not open PRs for you.'
            : null}
        </p>
      ) : null}
    </div>
  );
}
