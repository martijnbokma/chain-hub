import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, FolderTree } from 'lucide-react';
import { toast } from 'sonner';

import { ensureExplicitDescription, listAssetCompatIssues } from '@chain-hub/contracts';
import { libraryApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { AssetCompatBanner } from './AssetCompatBanner';
import { AssetDetailActions } from './AssetDetailActions';
import { AssetFileTabs } from './AssetFileTabs';
import { AssetProvenanceCard } from './AssetProvenanceCard';
import { AssetRenameTitle } from './AssetRenameTitle';
import { contentForClipboard, KIND_META } from './asset-helpers';

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
            <AssetRenameTitle
              canRename={canRename}
              isRenaming={isRenaming}
              isRenamingUi={isRenamingUi}
              name={selected.name}
              onCancelRename={() => {
                setIsRenamingUi(false);
                setRenameValue(selected.name);
              }}
              onRenameValueChange={setRenameValue}
              onStartRename={() => {
                setRenameValue(selected.name);
                setIsRenamingUi(true);
              }}
              onSubmitRename={submitRename}
              renameValue={renameValue}
            />
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
            <AssetCompatBanner
              isFixingDescriptionWithAi={isFixingDescriptionWithAi}
              isForkingAndFixingHeading={isForkingAndFixingHeading}
              isForkingAndFixingWithAi={isForkingAndFixingWithAi}
              isUpstreamSkill={isUpstreamSkill}
              issue={blockingCompatIssue}
              onFixDescriptionWithAi={onFixDescriptionWithAi}
              onFixFromHeading={handleFixDescription}
              onForkAndFixHeading={onForkAndFixHeading}
              onForkAndFixWithAi={onForkAndFixWithAi}
            />
          ) : null}
          <AssetProvenanceCard
            isRetryingCheck={isRetryingCheck}
            isUnlinking={isUnlinking}
            isUpstreamSkill={isUpstreamSkill}
            kind={selected.kind}
            onRelink={onRelink}
            onRetryCheck={onRetryCheck}
            onUnlink={onUnlink}
            provenance={provenance}
            updateAvailable={updateAvailable}
            upstreamBrowseUrl={upstreamBrowseUrl}
          />
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
            <AssetFileTabs
              activeTab={activeTab}
              fileSearch={fileSearch}
              filesMenuRef={filesMenuRef}
              filteredFiles={filteredFiles}
              isFilesMenuOpen={isFilesMenuOpen}
              nonDirectoryFiles={nonDirectoryFiles}
              onCloseTab={handleCloseTab}
              onFileSearchChange={setFileSearch}
              onOpenFile={handleOpenFile}
              onSelectTab={setActiveTab}
              onToggleFilesMenu={() => setIsFilesMenuOpen((prev) => !prev)}
              openTabs={openTabs}
            />
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
        <AssetDetailActions
          canSave={canSave}
          copied={copied}
          hasContent={Boolean(editorContent.trim())}
          isAuditing={isAuditing}
          isDeleting={isDeleting}
          isForking={isForking}
          isPrompt={isPrompt}
          isReassessing={isReassessing}
          isSaving={isSaving}
          isSidecarActive={isSidecarActive}
          isUpdating={isUpdating}
          isUpstreamSkill={isUpstreamSkill}
          kind={selected.kind}
          onAuditAsset={onAuditAsset}
          onBackToMain={() => setActiveTab('SKILL.md')}
          onCopy={() => {
            void handleCopy();
          }}
          onFork={onFork}
          onReassessKind={onReassessKind}
          onRequestDelete={onRequestDelete}
          onSave={handleSave}
          onUpdateFromSource={onUpdateFromSource}
          updateAvailable={updateAvailable}
          upstreamBrowseUrl={upstreamBrowseUrl}
        />
      </CardContent>
    </Card>
  );
}
