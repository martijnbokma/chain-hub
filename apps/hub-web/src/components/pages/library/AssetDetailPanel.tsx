import React, { Suspense, useState } from 'react';
import { ArrowLeft, Check, ClipboardCopy, ExternalLink, GitFork, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AssetKind, SkillLockEntry } from '@/types';
import { contentForClipboard, formatSkillSource, formatSkillSourceType } from './asset-helpers';

const MarkdownSourceEditor = React.lazy(async () => {
  const module = await import('@/components/common/MarkdownSourceEditor');
  return { default: module.MarkdownSourceEditor };
});

interface AssetDetailPanelProps {
  selected: { kind: AssetKind; name: string };
  provenance: SkillLockEntry | null | undefined;
  isUpstreamSkill: boolean;
  upstreamBrowseUrl: string | null;
  editorContent: string;
  onEditorChange: (value: string) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  onFork: () => void;
  isForking: boolean;
  onUpdateFromSource: () => void;
  isUpdating: boolean;
  onRequestDelete: () => void;
  isDeleting: boolean;
}

export function AssetDetailPanel({
  selected,
  provenance,
  isUpstreamSkill,
  upstreamBrowseUrl,
  editorContent,
  onEditorChange,
  onBack,
  onSave,
  isSaving,
  onFork,
  isForking,
  onUpdateFromSource,
  isUpdating,
  onRequestDelete,
  isDeleting
}: AssetDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const isPrompt = selected.kind === 'prompts';

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

  return (
    <Card
      className={cn(
        'fixed inset-0 z-40 flex flex-col overflow-hidden rounded-none border-0 bg-card',
        'xl:static xl:z-auto xl:rounded-xl xl:border xl:border-border xl:bg-card'
      )}
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          <Button className="xl:hidden" onClick={onBack} size="icon-sm" variant="ghost">
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back to index</span>
          </Button>
          <div className="grid min-w-0 gap-1">
            <CardTitle className="truncate">{selected.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {isUpstreamSkill ? `Viewing upstream ${selected.kind}` : `Editing ${selected.kind}`}
            </p>
          </div>
        </div>
        <Badge variant="accent">{selected.kind}</Badge>
      </CardHeader>
      <CardContent className="grid flex-1 grid-rows-[auto_1fr_auto] gap-4 overflow-hidden">
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
        <div className="min-h-0">
          <Suspense fallback={<Skeleton className="h-full min-h-50 w-full rounded-xl" />}>
            <MarkdownSourceEditor
              aria-label={
                isUpstreamSkill ? `View ${selected.kind} ${selected.name}` : `Edit ${selected.kind} ${selected.name}`
              }
              onChange={onEditorChange}
              onSave={() => {
                if (!isUpstreamSkill && !isSaving) {
                  onSave();
                }
              }}
              readOnly={isUpstreamSkill}
              value={editorContent}
            />
          </Suspense>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            className="w-fit"
            disabled={!editorContent.trim()}
            onClick={() => {
              void handleCopy();
            }}
            type="button"
            variant={isPrompt ? 'default' : 'secondary'}
          >
            {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
            {copied ? 'Copied' : isPrompt ? 'Copy prompt' : 'Copy'}
          </Button>
          {isUpstreamSkill ? (
            <Button className="w-fit" disabled={isForking} onClick={onFork}>
              <GitFork className="size-4" />
              {isForking ? 'Forking…' : 'Fork to customize'}
            </Button>
          ) : (
            <Button className="w-fit" disabled={isSaving} onClick={onSave} variant={isPrompt ? 'secondary' : 'default'}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          )}
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
          <Button className="w-fit" disabled={isDeleting} onClick={onRequestDelete} variant="secondary">
            <Trash2 className="size-4" />
            {isDeleting ? 'Deleting…' : 'Delete asset'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
