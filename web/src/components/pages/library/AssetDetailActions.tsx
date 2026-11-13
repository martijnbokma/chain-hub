import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  ExternalLink,
  GitFork,
  ListChecks,
  RefreshCw,
  ScanSearch,
  Trash2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AssetKind } from '@/types';

interface AssetDetailActionsProps {
  kind: AssetKind;
  isPrompt: boolean;
  isSidecarActive: boolean;
  isUpstreamSkill: boolean;
  upstreamBrowseUrl: string | null;
  hasContent: boolean;
  copied: boolean;
  onCopy: () => void;
  isUpdating: boolean;
  onUpdateFromSource: () => void;
  updateAvailable: boolean;
  isReassessing: boolean;
  onReassessKind: () => void;
  isAuditing: boolean;
  onAuditAsset: () => void;
  isDeleting: boolean;
  onRequestDelete: () => void;
  onBackToMain: () => void;
  isForking: boolean;
  onFork: () => void;
  canSave: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function AssetDetailActions({
  kind,
  isPrompt,
  isSidecarActive,
  isUpstreamSkill,
  upstreamBrowseUrl,
  hasContent,
  copied,
  onCopy,
  isUpdating,
  onUpdateFromSource,
  updateAvailable,
  isReassessing,
  onReassessKind,
  isAuditing,
  onAuditAsset,
  isDeleting,
  onRequestDelete,
  onBackToMain,
  isForking,
  onFork,
  canSave,
  isSaving,
  onSave
}: AssetDetailActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        className="w-fit"
        disabled={!hasContent && !isSidecarActive}
        onClick={onCopy}
        type="button"
        variant="secondary"
      >
        {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
        {copied ? 'Copied' : isSidecarActive ? 'Copy file' : isPrompt ? 'Copy prompt' : 'Copy'}
      </Button>
      {isUpstreamSkill && kind === 'skills' ? (
        <Button
          className="w-fit"
          loading={isUpdating}
          onClick={onUpdateFromSource}
          variant={updateAvailable ? 'default' : 'secondary'}
        >
          <RefreshCw className="size-4" />
          {isUpdating ? 'Updating…' : updateAvailable ? 'Update to latest' : 'Update from source'}
        </Button>
      ) : null}
      {upstreamBrowseUrl ? (
        <Button
          className="w-fit"
          onClick={() => window.open(upstreamBrowseUrl, '_blank', 'noopener,noreferrer')}
          type="button"
          variant="secondary"
        >
          <ExternalLink className="size-4" />
          Open source repo
        </Button>
      ) : null}
      <Button
        className="w-fit"
        disabled={!hasContent}
        loading={isReassessing}
        onClick={onReassessKind}
        type="button"
        variant="secondary"
      >
        <ScanSearch className="size-4" />
        {isReassessing ? 'Checking…' : 'Reassess kind'}
      </Button>
      <Button
        className="w-fit"
        disabled={!hasContent}
        loading={isAuditing}
        onClick={onAuditAsset}
        type="button"
        variant="secondary"
      >
        <ListChecks className="size-4" />
        {isAuditing ? 'Auditing…' : 'Audit'}
      </Button>
      <Button className="w-fit" loading={isDeleting} onClick={onRequestDelete} variant="secondary">
        <Trash2 className="size-4" />
        {isDeleting ? 'Deleting…' : 'Delete asset'}
      </Button>
      {isSidecarActive ? (
        <Button className="ml-auto w-fit" onClick={onBackToMain} type="button" variant="secondary">
          <ArrowLeft className="size-4" />
          Back to SKILL.md
        </Button>
      ) : isUpstreamSkill ? (
        <Button className="ml-auto w-fit" loading={isForking} onClick={onFork}>
          <GitFork className="size-4" />
          {isForking ? 'Forking…' : 'Fork to customize'}
        </Button>
      ) : (
        <Button className="ml-auto w-fit" disabled={!canSave} loading={isSaving} onClick={onSave}>
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      )}
    </div>
  );
}
