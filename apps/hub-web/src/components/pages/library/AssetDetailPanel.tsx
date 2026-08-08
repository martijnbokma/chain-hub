import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  ExternalLink,
  GitFork,
  Pencil,
  RefreshCw,
  ScanSearch,
  ListChecks,
  Sparkles,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import { toast } from 'sonner';

import { ensureExplicitDescription, listAssetCompatIssues } from '@chain-hub/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AssetKind, AuditAssetFinding, AuditAssetResult, ClassifyAssetResult, SkillLockEntry } from '@/types';
import { contentForClipboard, formatSkillSource, formatSkillSourceType, KIND_META } from './asset-helpers';

const MarkdownSourceEditor = React.lazy(async () => {
  const module = await import('@/components/common/MarkdownSourceEditor');
  return { default: module.MarkdownSourceEditor };
});

interface AssetDetailPanelProps {
  selected: { kind: AssetKind; name: string };
  author: string | null | undefined;
  provenance: SkillLockEntry | null | undefined;
  isUpstreamSkill: boolean;
  upstreamBrowseUrl: string | null;
  editorContent: string;
  onEditorChange: (value: string) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  onRename: (nextName: string) => void;
  isRenaming: boolean;
  onFork: () => void;
  isForking: boolean;
  onUpdateFromSource: () => void;
  isUpdating: boolean;
  onRequestDelete: () => void;
  isDeleting: boolean;
  kindAssessment: ClassifyAssetResult | null;
  onReassessKind: () => void;
  isReassessing: boolean;
  onConvertKind: (toKind: AssetKind) => void;
  isConverting: boolean;
  assetAudit: AuditAssetResult | null;
  onAuditAsset: () => void;
  isAuditing: boolean;
  onImproveAsset: () => void;
  isImproving: boolean;
}

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

export function AssetDetailPanel({
  selected,
  author,
  provenance,
  isUpstreamSkill,
  upstreamBrowseUrl,
  editorContent,
  onEditorChange,
  onBack,
  onSave,
  isSaving,
  onRename,
  isRenaming,
  onFork,
  isForking,
  onUpdateFromSource,
  isUpdating,
  onRequestDelete,
  isDeleting,
  kindAssessment,
  onReassessKind,
  isReassessing,
  onConvertKind,
  isConverting,
  assetAudit,
  onAuditAsset,
  isAuditing,
  onImproveAsset,
  isImproving
}: AssetDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isRenamingUi, setIsRenamingUi] = useState(false);
  const [renameValue, setRenameValue] = useState(selected.name);
  const isPrompt = selected.kind === 'prompts';
  const canRename = !isUpstreamSkill;
  const compatIssues = useMemo(
    () => listAssetCompatIssues(selected.kind, editorContent),
    [selected.kind, editorContent]
  );
  const blockingCompatIssue = compatIssues.find((issue) => issue.severity === 'error') ?? null;
  const canSave = !isUpstreamSkill && !isSaving && !blockingCompatIssue;

  useEffect(() => {
    setRenameValue(selected.name);
    setIsRenamingUi(false);
  }, [selected.kind, selected.name]);

  function handleFixDescription() {
    const next = ensureExplicitDescription(editorContent, selected.name);
    onEditorChange(next);
    toast.success('Added description from heading — save to apply');
  }

  function handleSave() {
    if (blockingCompatIssue) {
      toast.error(blockingCompatIssue.message);
      return;
    }
    onSave();
  }

  async function handleCopy() {
    const text = contentForClipboard(editorContent, selected.kind).trim();
    if (!text) {
      toast.error(isPrompt ? 'Nothing to copy yet' : 'Content is empty');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(isPrompt ? 'Prompt copied' : 'Content copied');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  function submitRename() {
    const next = renameValue.trim();
    if (!next || next === selected.name) {
      setIsRenamingUi(false);
      setRenameValue(selected.name);
      return;
    }
    onRename(next);
  }

  const recommendedLabel = kindAssessment
    ? (KIND_META[kindAssessment.recommendedKind]?.label ?? kindAssessment.recommendedKind)
    : null;
  const canConvert =
    !isUpstreamSkill &&
    kindAssessment !== null &&
    !kindAssessment.matchesCurrent;

  return (
    <Card
      className={cn(
        'fixed inset-0 z-40 flex min-w-0 flex-col overflow-hidden rounded-none border-0 bg-card',
        'xl:static xl:z-auto xl:rounded-xl xl:border xl:border-border xl:bg-card'
      )}
    >
      <CardHeader>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Button className="xl:hidden" onClick={onBack} size="icon-sm" variant="ghost">
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back to index</span>
          </Button>
          <div className="grid min-w-0 flex-1 gap-1">
            {isRenamingUi ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Input
                  aria-label="Asset name"
                  autoFocus
                  className="max-w-md font-mono text-sm"
                  disabled={isRenaming}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      submitRename();
                    }
                    if (event.key === 'Escape') {
                      setIsRenamingUi(false);
                      setRenameValue(selected.name);
                    }
                  }}
                  value={renameValue}
                />
                <Button disabled={isRenaming || !renameValue.trim()} onClick={submitRename} size="icon-sm" type="button">
                  <Check className="size-4" />
                  <span className="sr-only">Save name</span>
                </Button>
                <Button
                  disabled={isRenaming}
                  onClick={() => {
                    setIsRenamingUi(false);
                    setRenameValue(selected.name);
                  }}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <X className="size-4" />
                  <span className="sr-only">Cancel rename</span>
                </Button>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <CardTitle className="truncate">{selected.name}</CardTitle>
                {canRename ? (
                  <Button
                    onClick={() => {
                      setRenameValue(selected.name);
                      setIsRenamingUi(true);
                    }}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Rename asset</span>
                  </Button>
                ) : null}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {isUpstreamSkill ? `Viewing upstream ${selected.kind}` : `Editing ${selected.kind}`}
              {isRenaming ? ' · Renaming…' : null}
            </p>
            {author ? <p className="text-xs text-muted-foreground">Author · {author}</p> : null}
          </div>
        </div>
        <Badge variant="accent">{selected.kind}</Badge>
      </CardHeader>
      <CardContent className="grid flex-1 grid-rows-[minmax(0,auto)_1fr_auto] gap-4 overflow-hidden">
        <div className="grid min-h-0 max-h-72 gap-3 overflow-y-auto">
          {blockingCompatIssue ? (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">Editor compatibility</span>
                <Badge variant="warning">Missing description</Badge>
              </div>
              <p className="mt-1 leading-5 text-foreground/80">{blockingCompatIssue.message}</p>
              {isUpstreamSkill ? (
                <p className="mt-2 leading-5 text-foreground/80">
                  Fork this skill first if you want to add a description locally.
                </p>
              ) : (
                <Button className="mt-3 w-fit" onClick={handleFixDescription} size="sm" type="button">
                  <Wrench className="size-4" />
                  Fix from heading
                </Button>
              )}
            </div>
          ) : null}
          {selected.kind === 'skills' ? (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">Source</span>
                <Badge variant="default">{formatSkillSourceType(provenance)}</Badge>
                {isUpstreamSkill ? <Badge variant="default">Upstream-owned</Badge> : null}
              </div>
              <p className="mt-1 break-all font-mono leading-5 text-foreground/80">
                {formatSkillSource(provenance)}
              </p>
              {provenance?.subdir ? (
                <p className="mt-1">
                  Subdir · <span className="font-mono">{provenance.subdir}</span>
                </p>
              ) : null}
              {provenance?.updatedAt ? (
                <p className="mt-1">Locked · {new Date(provenance.updatedAt).toLocaleString()}</p>
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
          ) : null}
          {kindAssessment ? (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">Kind check</span>
                <Badge variant={kindAssessment.matchesCurrent ? 'default' : 'accent'}>
                  {kindAssessment.matchesCurrent ? 'Matches' : `Suggests ${recommendedLabel}`}
                </Badge>
              </div>
              <p className="mt-1 leading-5 text-foreground/80">{kindAssessment.reason}</p>
              {canConvert ? (
                <Button
                  className="mt-3 w-fit"
                  disabled={isConverting}
                  onClick={() => onConvertKind(kindAssessment.recommendedKind)}
                  size="sm"
                  type="button"
                >
                  {isConverting
                    ? 'Converting…'
                    : `Convert to ${kindAssessment.recommendedKind}`}
                </Button>
              ) : null}
              {isUpstreamSkill && !kindAssessment.matchesCurrent ? (
                <p className="mt-2 leading-5 text-foreground/80">
                  Fork this skill first if you want to convert a customized copy.
                </p>
              ) : null}
            </div>
          ) : null}
          {assetAudit ? (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">Audit</span>
                <Badge variant="default">
                  {assetAudit.findings.length === 0
                    ? 'No findings'
                    : `${assetAudit.findings.length} findings`}
                </Badge>
              </div>
              <p className="mt-1 leading-5 text-foreground/80">{assetAudit.summary}</p>
              {assetAudit.findings.length > 0 ? (
                <ul className="mt-3 grid gap-2">
                  {assetAudit.findings.map((finding) => (
                    <li
                      className="rounded-lg border border-border bg-card px-3 py-2"
                      key={`${finding.severity}-${finding.title}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={finding.severity === 'high' ? 'accent' : 'default'}>
                          {severityLabel(finding.severity)}
                        </Badge>
                        <span className="font-medium text-foreground">{finding.title}</span>
                      </div>
                      <p className="mt-1 leading-5 text-foreground/80">{finding.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {assetAudit.findings.length > 0 ? (
                isUpstreamSkill ? (
                  <p className="mt-3 leading-5 text-foreground/80">
                    Fork this skill first if you want AI to apply improvements to a local copy.
                  </p>
                ) : (
                  <Button
                    className="mt-3 w-fit"
                    disabled={isImproving || !editorContent.trim()}
                    onClick={onImproveAsset}
                    size="sm"
                    type="button"
                  >
                    <Sparkles className="size-4" />
                    {isImproving ? 'Improving…' : 'Apply improvements'}
                  </Button>
                )
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="min-h-0">
          <Suspense fallback={<Skeleton className="h-full min-h-50 w-full rounded-xl" />}>
            <MarkdownSourceEditor
              aria-label={
                isUpstreamSkill ? `View ${selected.kind} ${selected.name}` : `Edit ${selected.kind} ${selected.name}`
              }
              onChange={onEditorChange}
              onSave={() => {
                if (canSave) {
                  handleSave();
                }
              }}
              readOnly={isUpstreamSkill}
              value={editorContent}
            />
          </Suspense>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="w-fit"
            disabled={!editorContent.trim()}
            onClick={() => {
              void handleCopy();
            }}
            type="button"
            variant="secondary"
          >
            {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
            {copied ? 'Copied' : isPrompt ? 'Copy prompt' : 'Copy'}
          </Button>
          {isUpstreamSkill ? (
            <Button className="w-fit" disabled={isUpdating} onClick={onUpdateFromSource} variant="secondary">
              <RefreshCw className="size-4" />
              {isUpdating ? 'Updating…' : 'Update from source'}
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
            disabled={!editorContent.trim() || isReassessing}
            onClick={onReassessKind}
            type="button"
            variant="secondary"
          >
            <ScanSearch className="size-4" />
            {isReassessing ? 'Checking…' : 'Reassess kind'}
          </Button>
          <Button
            className="w-fit"
            disabled={!editorContent.trim() || isAuditing}
            onClick={onAuditAsset}
            type="button"
            variant="secondary"
          >
            <ListChecks className="size-4" />
            {isAuditing ? 'Auditing…' : 'Audit'}
          </Button>
          <Button className="w-fit" disabled={isDeleting} onClick={onRequestDelete} variant="secondary">
            <Trash2 className="size-4" />
            {isDeleting ? 'Deleting…' : 'Delete asset'}
          </Button>
          {isUpstreamSkill ? (
            <Button className="ml-auto w-fit" disabled={isForking} onClick={onFork}>
              <GitFork className="size-4" />
              {isForking ? 'Forking…' : 'Fork to customize'}
            </Button>
          ) : (
            <Button className="ml-auto w-fit" disabled={!canSave} onClick={handleSave}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
