import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ClipboardCopy,
  ExternalLink,
  FileCode,
  FileText,
  FolderTree,
  GitFork,
  Pencil,
  RefreshCw,
  ScanSearch,
  Search,
  ListChecks,
  Sparkles,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import { toast } from 'sonner';

import { ensureExplicitDescription, listAssetCompatIssues } from '@chain-hub/contracts';
import { libraryApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type {
  AssetKind,
  AuditAssetResult,
  ClassifyAssetResult,
  SkillFileEntry,
  SkillLockEntry
} from '@/types';
import { AssetAuditCard } from './AssetAuditCard';
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
  updateAvailable: boolean;
  onRequestDelete: () => void;
  isDeleting: boolean;
  onFixDescriptionWithAi: () => void;
  isFixingDescriptionWithAi: boolean;
  onForkAndFixHeading: () => void;
  isForkingAndFixingHeading: boolean;
  onForkAndFixWithAi: () => void;
  isForkingAndFixingWithAi: boolean;
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
  skillFiles: SkillFileEntry[];
  onPreviewFile?: (path: string) => void;
  activeFile?: string;
  onSelectFile?: (path: string) => void;
  onOpenFileManager?: () => void;
  onRetryCheck?: () => void;
  isRetryingCheck?: boolean;
  onRelink?: () => void;
  onUnlink?: () => void;
  isUnlinking?: boolean;
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
  updateAvailable,
  onRequestDelete,
  isDeleting,
  onFixDescriptionWithAi,
  isFixingDescriptionWithAi,
  onForkAndFixHeading,
  isForkingAndFixingHeading,
  onForkAndFixWithAi,
  isForkingAndFixingWithAi,
  kindAssessment,
  onReassessKind,
  isReassessing,
  onConvertKind,
  isConverting,
  assetAudit,
  onAuditAsset,
  isAuditing,
  onImproveAsset,
  isImproving,
  skillFiles,
  onPreviewFile: _onPreviewFile,
  activeFile: propActiveFile,
  onSelectFile: propOnSelectFile,
  onOpenFileManager,
  onRetryCheck,
  isRetryingCheck = false,
  onRelink,
  onUnlink,
  isUnlinking = false
}: AssetDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isRenamingUi, setIsRenamingUi] = useState(false);
  const [renameValue, setRenameValue] = useState(selected.name);
  const [activeTab, setActiveTab] = useState<'SKILL.md' | string>(propActiveFile ?? 'SKILL.md');
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [isFilesMenuOpen, setIsFilesMenuOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const filesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propActiveFile) {
      setActiveTab(propActiveFile);
      if (propActiveFile !== 'SKILL.md') {
        setOpenTabs((prev) => (prev.includes(propActiveFile) ? prev : [...prev, propActiveFile]));
      }
    }
  }, [propActiveFile]);

  const nonDirectoryFiles = useMemo(
    () => skillFiles.filter((file) => !file.isDirectory),
    [skillFiles]
  );

  const filteredFiles = useMemo(() => {
    const q = fileSearch.trim().toLowerCase();
    if (!q) return nonDirectoryFiles;
    return nonDirectoryFiles.filter((file) => file.path.toLowerCase().includes(q));
  }, [nonDirectoryFiles, fileSearch]);

  const isSidecarActive = selected.kind === 'skills' && activeTab !== 'SKILL.md';
  const sidecarQuery = useQuery({
    queryKey: ['library', 'skill-file', selected.name, activeTab],
    queryFn: () => libraryApi.getSkillFile(selected.name, activeTab),
    enabled: isSidecarActive
  });

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
    setActiveTab('SKILL.md');
    setOpenTabs([]);
    setIsFilesMenuOpen(false);
    setFileSearch('');
  }, [selected.kind, selected.name]);

  useEffect(() => {
    if (!isFilesMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (filesMenuRef.current && !filesMenuRef.current.contains(event.target as Node)) {
        setIsFilesMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilesMenuOpen]);

  function handleOpenFile(filePath: string) {
    if (!openTabs.includes(filePath)) {
      setOpenTabs((prev) => [...prev, filePath]);
    }
    setActiveTab(filePath);
    propOnSelectFile?.(filePath);
    setIsFilesMenuOpen(false);
    setFileSearch('');
  }

  function handleCloseTab(filePath: string, event: React.MouseEvent) {
    event.stopPropagation();
    const nextTabs = openTabs.filter((p) => p !== filePath);
    setOpenTabs(nextTabs);
    if (activeTab === filePath) {
      setActiveTab('SKILL.md');
      propOnSelectFile?.('SKILL.md');
    }
  }

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
    const text = isSidecarActive
      ? sidecarQuery.data?.content ?? ''
      : contentForClipboard(editorContent, selected.kind).trim();

    if (!text) {
      toast.error(isPrompt ? 'Nothing to copy yet' : 'Content is empty');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(
        isSidecarActive ? `Copied ${activeTab}` : isPrompt ? 'Prompt copied' : 'Content copied'
      );
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
                <Button disabled={!renameValue.trim()} loading={isRenaming} onClick={submitRename} size="icon-sm" type="button">
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
                  <Button onClick={handleFixDescription} size="sm" type="button" variant="secondary">
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
          ) : null}
          {selected.kind === 'skills' || provenance ? (
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
                    {onRelink && selected.kind === 'skills' && provenance.sourceType === 'git' ? (
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
          ) : null}
          {selected.kind === 'skills' && nonDirectoryFiles.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <FolderTree className="size-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">Package files</span>
                <Badge variant="default">{nonDirectoryFiles.length}</Badge>
                <span className="hidden sm:inline text-muted-foreground">· Available as tabs in editor</span>
              </div>
              <div className="flex items-center gap-1.5">
                {onOpenFileManager ? (
                  <Button
                    className="h-6 px-2 text-xs"
                    onClick={onOpenFileManager}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <FolderTree className="mr-1 size-3" />
                    Files in sidebar
                  </Button>
                ) : null}
                <Button
                  className="h-6 px-2 text-xs"
                  onClick={() => setIsFilesMenuOpen((prev) => !prev)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Browse files <ChevronDown className="ml-1 size-3" />
                </Button>
              </div>
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
                  loading={isConverting}
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
          {assetAudit || isAuditing ? (
            <AssetAuditCard
              assetName={selected.name}
              audit={assetAudit}
              canImprove={Boolean(editorContent.trim())}
              isAuditing={isAuditing}
              isImproving={isImproving}
              isUpstreamSkill={isUpstreamSkill}
              onImprove={onImproveAsset}
            />
          ) : null}
        </div>
        <div className="flex min-h-0 flex-col">
          {selected.kind === 'skills' && nonDirectoryFiles.length > 0 ? (
            <div className="relative mb-2 flex items-center justify-between border-b border-border pb-1">
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
                <button
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono transition-colors',
                    activeTab === 'SKILL.md'
                      ? 'bg-muted font-medium text-foreground shadow-xs'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                  onClick={() => setActiveTab('SKILL.md')}
                  type="button"
                >
                  <FileText className="size-3.5" />
                  <span>SKILL.md</span>
                  <span className="rounded bg-background/80 px-1 py-0.2 text-[10px] text-muted-foreground uppercase">
                    Main
                  </span>
                </button>

                {openTabs.map((filePath) => {
                  const fileName = filePath.split('/').pop() ?? filePath;
                  const isActive = activeTab === filePath;
                  return (
                    <div
                      key={filePath}
                      className={cn(
                        'group flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono transition-colors',
                        isActive
                          ? 'bg-muted font-medium text-foreground shadow-xs'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      )}
                    >
                      <button
                        className="flex max-w-44 items-center gap-1.5 truncate text-left"
                        onClick={() => setActiveTab(filePath)}
                        title={filePath}
                        type="button"
                      >
                        <FileCode className="size-3.5 shrink-0" />
                        <span className="truncate">{fileName}</span>
                      </button>
                      <button
                        aria-label={`Close ${fileName}`}
                        className="rounded p-0.5 text-muted-foreground opacity-70 hover:bg-background/80 hover:text-foreground hover:opacity-100"
                        onClick={(e) => handleCloseTab(filePath, e)}
                        type="button"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="relative shrink-0 pl-2" ref={filesMenuRef}>
                <Button
                  className="h-7 gap-1 px-2 text-xs font-mono text-muted-foreground hover:text-foreground"
                  onClick={() => setIsFilesMenuOpen((prev) => !prev)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <span>+ Files</span>
                  <span className="text-[10px] text-muted-foreground">({nonDirectoryFiles.length})</span>
                  <ChevronDown className="size-3" />
                </Button>

                {isFilesMenuOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border border-border bg-card p-2 shadow-lg">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        autoFocus
                        className="h-8 pl-8 pr-2 text-xs font-mono"
                        onChange={(e) => setFileSearch(e.target.value)}
                        placeholder={`Search ${nonDirectoryFiles.length} files...`}
                        value={fileSearch}
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredFiles.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">No matching files</p>
                      ) : (
                        <ul className="grid gap-0.5">
                          {filteredFiles.map((file) => {
                            const isTabOpen = openTabs.includes(file.path);
                            const isCurrent = activeTab === file.path;
                            return (
                              <li key={file.path}>
                                <button
                                  className={cn(
                                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-xs transition-colors',
                                    isCurrent
                                      ? 'bg-muted font-medium text-foreground'
                                      : 'text-foreground/80 hover:bg-muted/50 hover:text-foreground'
                                  )}
                                  onClick={() => handleOpenFile(file.path)}
                                  type="button"
                                >
                                  <FileCode className="size-3.5 shrink-0 text-muted-foreground" />
                                  <span className="flex-1 truncate" title={file.path}>
                                    {file.path}
                                  </span>
                                  <span className="shrink-0 text-[11px] text-muted-foreground">
                                    {formatFileSize(file.size)}
                                  </span>
                                  {isTabOpen ? (
                                    <span className="size-1.5 shrink-0 rounded-full bg-primary" title="Open in tab" />
                                  ) : null}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1">
            {isSidecarActive ? (
              <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border">
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 truncate">
                    <Badge className="text-[10px] uppercase tracking-wider" variant="default">
                      Read-only
                    </Badge>
                    <span className="truncate font-mono font-medium text-foreground">{activeTab}</span>
                    {sidecarQuery.data ? <span>({formatFileSize(sidecarQuery.data.size)})</span> : null}
                    {sidecarQuery.data?.truncated ? (
                      <span className="font-medium text-warning-foreground">· Truncated (&gt;1 MB)</span>
                    ) : null}
                  </div>
                  <Button
                    className="h-6 px-2 text-xs"
                    onClick={() => setActiveTab('SKILL.md')}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowLeft className="mr-1 size-3" /> Back to SKILL.md
                  </Button>
                </div>
                <div className="min-h-0 flex-1">
                  {sidecarQuery.isLoading ? (
                    <Skeleton className="h-full min-h-50 w-full" />
                  ) : sidecarQuery.isError ? (
                    <div className="flex h-full items-center justify-center p-6 text-sm text-destructive">
                      Unable to load file content.
                    </div>
                  ) : (
                    <Suspense fallback={<Skeleton className="h-full min-h-50 w-full" />}>
                      <MarkdownSourceEditor
                        aria-label={`View sidecar ${activeTab}`}
                        onChange={() => {}}
                        readOnly={true}
                        value={sidecarQuery.data?.content ?? ''}
                      />
                    </Suspense>
                  )}
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="w-fit"
            disabled={!editorContent.trim() && !isSidecarActive}
            onClick={() => {
              void handleCopy();
            }}
            type="button"
            variant="secondary"
          >
            {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
            {copied ? 'Copied' : isSidecarActive ? 'Copy file' : isPrompt ? 'Copy prompt' : 'Copy'}
          </Button>
          {isUpstreamSkill && selected.kind === 'skills' ? (
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
            disabled={!editorContent.trim()}
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
            disabled={!editorContent.trim()}
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
            <Button
              className="ml-auto w-fit"
              onClick={() => setActiveTab('SKILL.md')}
              type="button"
              variant="secondary"
            >
              <ArrowLeft className="size-4" />
              Back to SKILL.md
            </Button>
          ) : isUpstreamSkill ? (
            <Button className="ml-auto w-fit" loading={isForking} onClick={onFork}>
              <GitFork className="size-4" />
              {isForking ? 'Forking…' : 'Fork to customize'}
            </Button>
          ) : (
            <Button className="ml-auto w-fit" disabled={!canSave} loading={isSaving} onClick={handleSave}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
