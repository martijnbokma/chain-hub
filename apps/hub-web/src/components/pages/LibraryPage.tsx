import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker, useSearchParams } from 'react-router-dom';
import { Download, FolderTree } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isUpstreamOwnedSkill, resolveSkillUpstreamBrowseUrl } from '@/lib/skill-ownership';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { analysisApi, libraryApi, overviewApi } from '@/lib/api';
import type {
  AnalysisItem,
  AssetKind,
  AssetRecord,
  FilterKind,
  OwnershipFilter,
  DiscoveredAsset
} from '@/types';
import { AiEditPreviewDialog } from './library/AiEditPreviewDialog';
import type { AnalysisEntry } from './library/analyze-assets';
import { AnalysisReview } from './library/AnalysisReview';
import { AnalyzeReportDialog } from './library/AnalyzeReportDialog';
import { AssetDetailPanel } from './library/AssetDetailPanel';
import { AssetFileManager } from './library/AssetFileManager';
import { AssetList } from './library/AssetList';
import {
  filterLibraryAssets,
  groupAssetsByKind,
  groupDiscoveredByEditor,
  parseKindParam,
  parseOwnershipParam,
  parseSelectedAssetParams
} from './library/asset-helpers';
import { CreateAssetDialog } from './library/CreateAssetDialog';
import { DiscoverDialog } from './library/DiscoverDialog';
import { InstallSkillDialog } from './library/InstallSkillDialog';
import { LibraryToolbar } from './library/LibraryToolbar';
import { DiscardChangesDialog } from './library/DiscardChangesDialog';
import { RemoveAssetDialog } from './library/RemoveAssetDialog';
import { SkillFilePreviewDialog } from './library/SkillFilePreviewDialog';
import { useLibraryAiActions } from './library/use-library-ai-actions';
import { assetKey, useAnalysisReview } from './library/use-analysis-review';
import { useLibraryAnalysis } from './library/use-library-analysis';
import { useLibraryCreateFlow } from './library/use-library-create-flow';
import { useLibraryInstallFlow } from './library/use-library-install-flow';

export function LibraryPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<{ kind: AssetKind; name: string } | null>(null);
  const [masterView, setMasterView] = useState<'assets' | 'files'>('assets');
  const [activeFile, setActiveFile] = useState<string>('SKILL.md');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<FilterKind>(() => parseKindParam(searchParams.get('kind')));
  const [ownership, setOwnership] = useState<OwnershipFilter>(() =>
    parseOwnershipParam(searchParams.get('ownership'))
  );
  const [editorContent, setEditorContent] = useState('');
  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null);
  const [autoAuditAsset, setAutoAuditAsset] = useState<string | null>(null);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [view, setView] = useState<'assets' | 'review'>('assets');
  const analysis = useLibraryAnalysis();

  const createFlow = useLibraryCreateFlow({
    searchParams,
    setSearchParams,
    onCreated: setSelected
  });

  const installFlow = useLibraryInstallFlow({
    onInstalled: setSelected
  });

  const { setCreateOpenFromParams } = createFlow;

  useEffect(() => {
    setCreateOpenFromParams(searchParams.get('create') === '1');
    setFilterKind(parseKindParam(searchParams.get('kind')));
    setOwnership(parseOwnershipParam(searchParams.get('ownership')));
    const linkedAsset = parseSelectedAssetParams(searchParams.get('kind'), searchParams.get('asset'));
    if (linkedAsset) {
      setSelected(linkedAsset);
      if (searchParams.get('audit') === '1') {
        setAutoAuditAsset(linkedAsset.name);
      }
      // Consume the deep link so closing the panel does not reopen it on the next param change.
      const next = new URLSearchParams(searchParams);
      next.delete('asset');
      next.delete('audit');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setCreateOpenFromParams, setSearchParams]);

  const setOwnershipSynced = (nextOwnership: OwnershipFilter) => {
    setOwnership(nextOwnership);
    const next = new URLSearchParams(searchParams);
    if (nextOwnership === 'all') {
      next.delete('ownership');
    } else {
      next.set('ownership', nextOwnership);
    }
    setSearchParams(next, { replace: true });
  };

  const library = useQuery({
    queryKey: ['library'],
    queryFn: () => libraryApi.getAll()
  });

  const overview = useQuery({
    queryKey: ['overview'],
    queryFn: () => overviewApi.get()
  });

  const selectedAsset = useQuery({
    queryKey: ['library', 'detail', selected?.kind, selected?.name],
    queryFn: () => libraryApi.getByKindAndName(selected?.kind || '', selected?.name || ''),
    enabled: selected !== null
  });

  const skillFiles = useQuery({
    queryKey: ['library', 'skill-files', selected?.name],
    queryFn: () => libraryApi.getSkillFiles(selected?.name || ''),
    enabled: selected?.kind === 'skills'
  });

  const {
    kindAssessment,
    assetAudit,
    pendingAiEdit,
    resetAiResults,
    seedAiResults,
    approveAiEdit,
    discardAiEdit,
    reassessKind,
    auditAsset,
    improveAsset,
    fixDescriptionWithAi,
    forkAndFixDescription
  } = useLibraryAiActions({ selected, editorContent, setEditorContent, setSelected });

  const auditAssetMutateRef = useRef(auditAsset.mutate);
  auditAssetMutateRef.current = auditAsset.mutate;

  useEffect(() => {
    if (autoAuditAsset && selected?.name !== autoAuditAsset) {
      setAutoAuditAsset(null);
    }
  }, [selected?.name, autoAuditAsset]);

  useEffect(() => {
    if (selectedAsset.data) {
      setEditorContent(selectedAsset.data.content);
      if (autoAuditAsset && autoAuditAsset === selectedAsset.data.name) {
        setAutoAuditAsset(null);
        auditAssetMutateRef.current(selectedAsset.data.content);
      }
    }
  }, [selectedAsset.data, autoAuditAsset]);

  useEffect(() => {
    setPreviewFilePath(null);
  }, [selected?.kind, selected?.name]);

  const isDirty = selectedAsset.data !== undefined && editorContent !== selectedAsset.data.content;
  // `undefined` = no switch pending; `null` = user asked to close the detail panel.
  const [pendingSelection, setPendingSelection] = useState<{ kind: AssetKind; name: string } | null | undefined>(
    undefined
  );

  function requestSelection(next: { kind: AssetKind; name: string } | null) {
    const sameAsset = next !== null && selected !== null && next.kind === selected.kind && next.name === selected.name;
    if (sameAsset) {
      setMasterView('files');
      return;
    }
    if (isDirty) {
      setPendingSelection(next);
      return;
    }
    setSelected(next);
    setMasterView('assets');
    setActiveFile('SKILL.md');
  }

  // Leaving the Library (sidebar, command palette, back button) would drop the edits too.
  const navigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    // Closing or reloading the tab would drop the edits; let the browser ask first.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const saveAsset = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      return libraryApi.update(selected.kind, selected.name, { content: editorContent });
    },
    onSuccess: (asset) => {
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['library', 'detail', asset.kind, asset.name] });
      toast.success(`Saved ${asset.kind}/${asset.name}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to save asset');
    }
  });

  const renameAsset = useMutation({
    mutationFn: async (nextName: string) => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      return libraryApi.rename(selected.kind, selected.name, { name: nextName });
    },
    onSuccess: (asset) => {
      setSelected({ kind: asset.kind as AssetKind, name: asset.name });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['library', 'detail'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Renamed to ${asset.kind}/${asset.name}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to rename asset');
    }
  });

  const discoverQuery = useQuery({
    queryKey: ['library', 'discover'],
    queryFn: () => libraryApi.discover(),
    enabled: discoverOpen
  });

  const importAsset = useMutation({
    mutationFn: async (candidate: DiscoveredAsset) => {
      return libraryApi.import({
        editorId: candidate.editorId,
        kind: candidate.kind,
        name: candidate.name
      });
    },
    onSuccess: (asset) => {
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['library', 'discover'] });
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Imported ${asset.kind}/${asset.name}`);
    },
    onError: () => {
      toast.error('Unable to import asset — it may already exist in the hub');
    }
  });

  const importMultipleAssets = useMutation({
    mutationFn: async (candidates: DiscoveredAsset[]) => {
      const unique: DiscoveredAsset[] = [];
      const seen = new Set<string>();
      for (const candidate of candidates) {
        const key = `${candidate.kind}/${candidate.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(candidate);
        }
      }

      let importedCount = 0;
      let skippedCount = 0;
      setImportProgress({ current: 0, total: unique.length });

      for (let i = 0; i < unique.length; i++) {
        const candidate = unique[i];
        setImportProgress({ current: i + 1, total: unique.length });
        try {
          await libraryApi.import({
            editorId: candidate.editorId,
            kind: candidate.kind,
            name: candidate.name
          });
          importedCount++;
        } catch {
          skippedCount++;
        }
      }

      return { importedCount, skippedCount, total: unique.length };
    },
    onSuccess: ({ importedCount, skippedCount }) => {
      setImportProgress(null);
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['library', 'discover'] });
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });

      if (importedCount > 0) {
        toast.success(
          skippedCount > 0
            ? `Imported ${importedCount} asset${importedCount === 1 ? '' : 's'} (${skippedCount} skipped)`
            : `Imported ${importedCount} asset${importedCount === 1 ? '' : 's'}`
        );
      } else {
        toast.error('No assets could be imported — they may already exist in the hub');
      }
    },
    onError: () => {
      setImportProgress(null);
      toast.error('Failed to import assets');
    }
  });

  const removeAsset = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      await libraryApi.delete(selected.kind, selected.name);
    },
    onSuccess: () => {
      setSelected(null);
      setEditorContent('');
      setRemoveOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success('Asset deleted');
    },
    onError: () => {
      toast.error('Unable to delete asset');
    }
  });

  const updateSkills = useMutation({
    mutationFn: async (name?: string) => {
      return libraryApi.updateSkills(name ? { name } : {});
    },
    onSuccess: (result) => {
      const updatedNames = result.results
        .filter((item) => item.status === 'updated' || item.status === 'migrated')
        .map((item) => item.name);
      const skippedNames = result.results
        .filter((item) => item.status === 'skipped')
        .map((item) => item.name);
      const failedItems = result.results.filter((item) => item.status === 'failed');

      void queryClient.invalidateQueries({ queryKey: ['library'] });
      if (selected) {
        void queryClient.invalidateQueries({
          queryKey: ['library', 'detail', selected.kind, selected.name]
        });
      }

      if (updatedNames.length > 0) {
        toast.success(
          updatedNames.length === 1 ? `Updated ${updatedNames[0]}` : `Updated ${updatedNames.length} skills`,
          { description: updatedNames.join(', '), duration: 6000 }
        );
      } else if (failedItems.length === 0) {
        toast.success(
          skippedNames.length === 1 ? `${skippedNames[0]} is already up to date` : 'All skills already up to date'
        );
      }

      if (failedItems.length > 0) {
        toast.error(
          failedItems.length === 1 ? `Failed to update ${failedItems[0].name}` : `${failedItems.length} skills failed to update`,
          {
            description: failedItems.map((item) => `${item.name}${item.error ? `: ${item.error}` : ''}`).join('\n'),
            duration: 8000
          }
        );
      }
    },
    onError: () => {
      toast.error('Unable to update skills from upstream');
    }
  });

  const forkSkill = useMutation({
    mutationFn: async (name: string) => {
      return libraryApi.forkSkill({ name });
    },
    onSuccess: (asset) => {
      setSelected({ kind: 'skills', name: asset.name });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['library', 'detail', asset.kind, asset.name] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Forked to skills/${asset.name} — safe to edit`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to fork skill');
    }
  });

  const convertKind = useMutation({
    mutationFn: async (toKind: AssetKind) => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      if (editorContent !== selectedAsset.data?.content) {
        await libraryApi.update(selected.kind, selected.name, {
          content: editorContent
        });
      }
      return libraryApi.convert(selected.kind, selected.name, { toKind });
    },
    onSuccess: (asset) => {
      resetAiResults();
      setSelected({ kind: asset.kind as AssetKind, name: asset.name });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['library', 'detail'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Converted to ${asset.kind}/${asset.name}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to convert asset');
    }
  });

  const analysisReport = useQuery({
    queryKey: ['analysis'],
    queryFn: () => analysisApi.get()
  });

  const assetsByKey = useMemo(() => {
    const map = new Map<string, AssetRecord>();
    for (const asset of library.data ?? []) {
      map.set(assetKey(asset.kind, asset.name), asset);
    }
    return map;
  }, [library.data]);

  const review = useAnalysisReview({ assetsByKey });

  async function runAnalysisAndSave() {
    const assets = library.data ?? [];
    const { entries, cancelled } = await analysis.run(assets);
    if (cancelled) {
      return;
    }
    try {
      const report = await analysisApi.save({
        totalAssets: assets.length,
        entries: entries.map((entry) => ({
          kind: entry.asset.kind,
          name: entry.asset.name,
          classification: entry.classification,
          classifyError: entry.classifyError,
          audit: entry.audit,
          auditError: entry.auditError,
          compatIssues: entry.asset.compatIssues ?? []
        }))
      });
      queryClient.setQueryData(['analysis'], report);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save analysis report');
    }
  }

  function handleAnalyze() {
    setAnalyzeOpen(true);
    if (analysis.status === 'idle') {
      void runAnalysisAndSave();
    }
  }

  function handleRunAnalysisAgain() {
    void runAnalysisAndSave();
  }

  function handleOpenAnalysisItem(item: AnalysisItem) {
    seedAiResults({
      kind: item.kind,
      name: item.name,
      kindAssessment:
        item.type === 'kind-mismatch' && item.recommendedKind
          ? {
              currentKind: item.kind,
              recommendedKind: item.recommendedKind,
              matchesCurrent: false,
              reason: item.reason ?? ''
            }
          : null,
      assetAudit:
        item.type === 'audit-findings' && item.findings
          ? { summary: item.summary ?? '', findings: item.findings }
          : null
    });
    const alreadySelected = selected?.kind === item.kind && selected?.name === item.name;
    if (!alreadySelected) {
      requestSelection({ kind: item.kind, name: item.name });
    }
  }

  function handleOpenAnalyzedAsset(entry: AnalysisEntry) {
    seedAiResults({
      kind: entry.asset.kind,
      name: entry.asset.name,
      kindAssessment: entry.classification,
      assetAudit: entry.audit
    });
    setAnalyzeOpen(false);
    const alreadySelected = selected?.kind === entry.asset.kind && selected?.name === entry.asset.name;
    if (!alreadySelected) {
      requestSelection({ kind: entry.asset.kind, name: entry.asset.name });
    }
  }

  // The run continues while the report dialog is closed; announce completion then.
  const prevAnalysisStatusRef = useRef(analysis.status);
  useEffect(() => {
    const previous = prevAnalysisStatusRef.current;
    prevAnalysisStatusRef.current = analysis.status;
    if (previous !== 'running' || analysis.status !== 'done' || analyzeOpen || analysis.cancelled) {
      return;
    }
    const flagged = analysis.entries.filter(
      (entry) => entry.classification !== null && !entry.classification.matchesCurrent
    ).length;
    toast.success(
      flagged > 0
        ? `Analysis complete — ${flagged} asset${flagged === 1 ? '' : 's'} need attention`
        : 'Analysis complete — all assets look right'
    );
  }, [analysis.status, analysis.cancelled, analysis.entries, analyzeOpen]);

  const isUpstreamSkill =
    selected?.kind === 'skills' && isUpstreamOwnedSkill(selectedAsset.data?.provenance ?? null);
  const upstreamBrowseUrl = resolveSkillUpstreamBrowseUrl(selectedAsset.data?.provenance ?? null);

  const filteredAssets = useMemo(
    () => filterLibraryAssets(library.data ?? [], filterKind, searchQuery, ownership),
    [filterKind, library.data, ownership, searchQuery]
  );

  const grouped = useMemo(() => groupAssetsByKind(filteredAssets), [filteredAssets]);

  const groupedDiscovered = useMemo(
    () => groupDiscoveredByEditor(discoverQuery.data ?? []),
    [discoverQuery.data]
  );

  const kindSections = Object.entries(grouped);
  const agentsDrift = overview.data?.agentsSkillsDrift;
  const hasAgentsDrift = (agentsDrift?.missingCount ?? 0) > 0;

  const listScrollRef = useRef<HTMLDivElement>(null);
  const [listAtTop, setListAtTop] = useState(true);
  const [listAtBottom, setListAtBottom] = useState(true);

  useEffect(() => {
    const el = listScrollRef.current;
    if (!el) {
      return;
    }
    const checkAtBottom = () => {
      setListAtTop(el.scrollTop < 4);
      setListAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 4);
    };
    checkAtBottom();
    el.addEventListener('scroll', checkAtBottom, { passive: true });
    const resizeObserver = new ResizeObserver(checkAtBottom);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', checkAtBottom);
      resizeObserver.disconnect();
    };
  }, [kindSections]);

  const isCandidateImporting = (candidate: DiscoveredAsset): boolean =>
    importMultipleAssets.isPending ||
    (importAsset.isPending &&
      importAsset.variables?.editorId === candidate.editorId &&
      importAsset.variables?.kind === candidate.kind &&
      importAsset.variables?.name === candidate.name);

  const listToolbar = (
    <LibraryToolbar
      assetCount={filteredAssets.length}
      filterKind={filterKind}
      isAnalyzing={analysis.status === 'running'}
      isCompact={selected !== null}
      isUpdatingSkills={updateSkills.isPending}
      onAnalyze={handleAnalyze}
      onCreate={() => createFlow.setCreateOpenSynced(true)}
      onDiscover={() => setDiscoverOpen(true)}
      onInstall={() => installFlow.setInstallOpen(true)}
      onOwnershipChange={setOwnershipSynced}
      onSearchQueryChange={setSearchQuery}
      onUpdateSkills={() => updateSkills.mutate(undefined)}
      onViewChange={setView}
      ownership={ownership}
      reviewOpenCount={analysisReport.data?.items.filter((item) => item.status === 'open').length ?? 0}
      searchQuery={searchQuery}
      view={view}
    />
  );

  if (library.isLoading) {
    return (
      <div className="flex h-[calc(100vh-2rem)] min-w-0 flex-col -mb-4 sm:-mb-6 sm:h-[calc(100vh-3rem)]">
        {listToolbar}
        <PageSkeleton className="min-h-0 flex-1" variant="workspace" />
      </div>
    );
  }

  if (library.isError) {
    return (
      <div className="flex h-[calc(100vh-2rem)] min-w-0 flex-col -mb-4 sm:-mb-6 sm:h-[calc(100vh-3rem)]">
        {listToolbar}
        <EmptyState description="The library index is temporarily unavailable." title="Unable to load library" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] min-w-0 flex-col -mb-4 sm:-mb-6 sm:h-[calc(100vh-3rem)]">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {hasAgentsDrift && agentsDrift ? (
          <div className="min-w-0 shrink-0 pb-3">
            <Alert className="items-center" variant="warning">
              <AlertIcon>
                <Download />
              </AlertIcon>
              <AlertDescription>
                {agentsDrift.missingCount} skill{agentsDrift.missingCount === 1 ? '' : 's'} in{' '}
                <code className="font-mono text-xs text-foreground">~/.agents</code>{' '}
                {agentsDrift.missingCount === 1 ? 'is' : 'are'} not in Hub yet
                {agentsDrift.missingNames.length > 0
                  ? ` (${agentsDrift.missingNames.slice(0, 3).join(', ')}${
                      agentsDrift.missingNames.length > 3 ? ', …' : ''
                    })`
                  : ''}
                .
              </AlertDescription>
              <Button
                className="shrink-0"
                loading={installFlow.migrateAgentsSkills.isPending}
                onClick={() => installFlow.migrateAgentsSkills.mutate()}
                size="sm"
              >
                {installFlow.migrateAgentsSkills.isPending ? 'Importing…' : 'Import into Hub'}
              </Button>
            </Alert>
          </div>
        ) : null}
        <div
          className={cn(
            'grid min-h-0 min-w-0 flex-1 gap-4',
            selected ? 'xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]' : 'grid-cols-1'
          )}
        >
          <div className={cn('flex min-h-0 min-w-0 flex-col', selected && 'hidden xl:flex')}>
            {selected && masterView === 'files' ? (
              <AssetFileManager
                activeFile={activeFile}
                assetKind={selected.kind}
                assetName={selected.name}
                files={skillFiles.data?.files ?? []}
                onBackToAssets={() => setMasterView('assets')}
                onSelectFile={(filePath) => setActiveFile(filePath)}
                provenanceSource={selectedAsset.data?.provenance?.source}
              />
            ) : (
              <>
                {selected ? (
                  <div className="mb-2 flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1.5 text-xs">
                    <span className="truncate text-muted-foreground">
                      Selected: <strong className="text-foreground">{selected.name}</strong>
                    </span>
                    <Button
                      className="h-6 shrink-0 gap-1 px-2 text-xs font-medium"
                      onClick={() => setMasterView('files')}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <FolderTree className="size-3" />
                      Files ({skillFiles.data?.files?.filter((f) => !f.isDirectory).length ?? 0}) →
                    </Button>
                  </div>
                ) : null}
                {listToolbar}
                <div
                  className={cn(
                    'min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto',
                    !selected && '-mr-4 pr-4 sm:-mr-6 sm:pr-6',
                    !listAtTop && 'fade-top',
                    !listAtBottom && 'fade-bottom'
                  )}
                  ref={listScrollRef}
                >
                  {view === 'review' ? (
                    <AnalysisReview
                      assetsByKey={assetsByKey}
                      batch={review.batch}
                      fixingId={review.fixingId}
                      isAnalyzing={analysis.status === 'running'}
                      onApplySelected={() =>
                        review.applyItems(
                          (analysisReport.data?.items ?? []).filter(
                            (item) => item.status === 'open' && review.selectedIds.has(item.id)
                          )
                        )
                      }
                      onFixItem={review.fixItem}
                      onOpenItem={handleOpenAnalysisItem}
                      onRunAgain={handleAnalyze}
                      onSelectAllOpen={() => review.selectAllOpen(analysisReport.data?.items ?? [])}
                      onSetStatus={(item, status) => void review.setItemStatus(item.id, status)}
                      onToggleSelect={review.toggleSelect}
                      report={analysisReport.data ?? null}
                      selectedIds={review.selectedIds}
                    />
                  ) : (
                    <AssetList
                      filterKind={filterKind}
                      kindSections={kindSections}
                      onSelect={(asset) => requestSelection({ kind: asset.kind as AssetKind, name: asset.name })}
                      selected={selected}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {selected ? (
            <AssetDetailPanel
              activeFile={activeFile}
              assetAudit={assetAudit}
              author={selectedAsset.data?.author}
              editorContent={editorContent}
              isAuditing={auditAsset.isPending || autoAuditAsset === selected.name}
              isConverting={convertKind.isPending}
              isDeleting={removeAsset.isPending}
              isFixingDescriptionWithAi={fixDescriptionWithAi.isPending}
              isForkingAndFixingHeading={
                forkAndFixDescription.isPending && forkAndFixDescription.variables === 'heading'
              }
              isForkingAndFixingWithAi={
                forkAndFixDescription.isPending && forkAndFixDescription.variables === 'ai'
              }
              isForking={forkSkill.isPending}
              isImproving={improveAsset.isPending}
              isReassessing={reassessKind.isPending}
              isRenaming={renameAsset.isPending}
              isSaving={saveAsset.isPending}
              isUpdating={updateSkills.isPending}
              isUpstreamSkill={isUpstreamSkill}
              kindAssessment={kindAssessment}
              onAuditAsset={() => auditAsset.mutate()}
              onBack={() => requestSelection(null)}
              onConvertKind={(toKind) => convertKind.mutate(toKind)}
              onEditorChange={setEditorContent}
              onFixDescriptionWithAi={() => fixDescriptionWithAi.mutate()}
              onFork={() => forkSkill.mutate(selected.name)}
              onForkAndFixHeading={() => forkAndFixDescription.mutate('heading')}
              onForkAndFixWithAi={() => forkAndFixDescription.mutate('ai')}
              onImproveAsset={() => improveAsset.mutate()}
              onOpenFileManager={() => setMasterView('files')}
              onPreviewFile={setPreviewFilePath}
              onReassessKind={() => reassessKind.mutate()}
              onRename={(nextName) => renameAsset.mutate(nextName)}
              onRequestDelete={() => setRemoveOpen(true)}
              onSave={() => saveAsset.mutate()}
              onSelectFile={(filePath) => setActiveFile(filePath)}
              onUpdateFromSource={() => updateSkills.mutate(selected.name)}
              provenance={selectedAsset.data?.provenance}
              selected={selected}
              skillFiles={skillFiles.data?.files ?? []}
              upstreamBrowseUrl={upstreamBrowseUrl}
            />
          ) : null}
        </div>

        <CreateAssetDialog
          draftContent={createFlow.draftContent}
          draftIntent={createFlow.draftIntent}
          draftKindChoice={createFlow.draftKindChoice}
          draftName={createFlow.draftName}
          draftNameLocked={createFlow.draftNameLocked}
          isDrafting={createFlow.draftPromptWithAi.isPending}
          isSubmitting={createFlow.createAsset.isPending}
          kindReason={createFlow.kindReason}
          onDraftContentChange={createFlow.setDraftContent}
          onDraftIntentChange={createFlow.setDraftIntent}
          onDraftKindChoiceChange={createFlow.handleDraftKindChoiceChange}
          onDraftNameChange={createFlow.setDraftName}
          onDraftNameLockedChange={createFlow.setDraftNameLocked}
          onDraftWithAi={() => createFlow.draftPromptWithAi.mutate()}
          onOpenChange={createFlow.setCreateOpenSynced}
          onSubmit={() => createFlow.createAsset.mutate()}
          open={createFlow.createOpen}
          resolvedKind={createFlow.draftKind}
        />

        <InstallSkillDialog
          browsedFolder={installFlow.browsedFolder}
          folderInputRef={installFlow.folderInputRef}
          installForce={installFlow.installForce}
          installMode={installFlow.installMode}
          installName={installFlow.installName}
          installPath={installFlow.installPath}
          installRepo={installFlow.installRepo}
          installSubdir={installFlow.installSubdir}
          isInstalling={installFlow.installSkill.isPending}
          isMigrating={installFlow.migrateAgentsSkills.isPending}
          onBrowseFiles={installFlow.handleBrowseFiles}
          onInstallForceChange={installFlow.setInstallForce}
          onInstallModeChange={(mode) => {
            installFlow.setInstallMode(mode);
            installFlow.setBrowsedFolder(null);
          }}
          onInstallNameChange={installFlow.setInstallName}
          onInstallPathChange={(value) => {
            installFlow.setBrowsedFolder(null);
            installFlow.setInstallPath(value);
          }}
          onInstallRepoChange={installFlow.setInstallRepo}
          onInstallSubdirChange={installFlow.setInstallSubdir}
          onMigrate={() => installFlow.migrateAgentsSkills.mutate()}
          onOpenChange={installFlow.setInstallOpen}
          onSubmit={() => installFlow.installSkill.mutate()}
          open={installFlow.installOpen}
          submitDisabled={installFlow.installSubmitDisabled}
        />

        <DiscardChangesDialog
          assetLabel={selected ? `${selected.kind}/${selected.name}` : 'this asset'}
          onDiscard={() => {
            if (navigationBlocker.state === 'blocked') {
              navigationBlocker.proceed();
              return;
            }
            setSelected(pendingSelection ?? null);
            setMasterView('assets');
            setActiveFile('SKILL.md');
            setPendingSelection(undefined);
          }}
          onKeepEditing={() => {
            if (navigationBlocker.state === 'blocked') {
              navigationBlocker.reset();
            }
            setPendingSelection(undefined);
          }}
          open={pendingSelection !== undefined || navigationBlocker.state === 'blocked'}
        />
        <RemoveAssetDialog
          isDeleting={removeAsset.isPending}
          onConfirm={() => removeAsset.mutate()}
          onOpenChange={setRemoveOpen}
          open={removeOpen}
          selected={selected}
        />

        <AiEditPreviewDialog
          onApprove={approveAiEdit}
          onDiscard={discardAiEdit}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              discardAiEdit();
            }
          }}
          open={pendingAiEdit !== null}
          pendingEdit={pendingAiEdit}
        />

        <DiscoverDialog
          groupedDiscovered={groupedDiscovered}
          importProgress={importProgress}
          isCandidateImporting={isCandidateImporting}
          isImportingAll={importMultipleAssets.isPending}
          isLoading={discoverQuery.isLoading}
          onImport={(candidate) => importAsset.mutate(candidate)}
          onImportAll={(candidates) => importMultipleAssets.mutate(candidates)}
          onOpenChange={setDiscoverOpen}
          open={discoverOpen}
        />

        <AnalyzeReportDialog
          cancelled={analysis.cancelled}
          entries={analysis.entries}
          onCancel={analysis.cancel}
          onOpenAsset={handleOpenAnalyzedAsset}
          onOpenChange={setAnalyzeOpen}
          onRunAgain={handleRunAnalysisAgain}
          open={analyzeOpen}
          progress={analysis.progress}
          status={analysis.status}
          totalAssets={library.data?.length ?? 0}
        />

        <AiEditPreviewDialog
          onApprove={() => void review.approveQueuedDiff()}
          onDiscard={review.discardQueuedDiff}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              review.discardQueuedDiff();
            }
          }}
          open={pendingAiEdit === null && review.diffQueue.length > 0}
          pendingEdit={
            pendingAiEdit === null && review.diffQueue.length > 0
              ? {
                  label: `Improve ${review.diffQueue[0].kind}/${review.diffQueue[0].name}`,
                  before: review.diffQueue[0].before,
                  after: review.diffQueue[0].after
                }
              : null
          }
        />

        <SkillFilePreviewDialog
          onOpenChange={(open) => {
            if (!open) {
              setPreviewFilePath(null);
            }
          }}
          path={previewFilePath}
          skillName={selected?.kind === 'skills' ? selected.name : null}
        />
      </section>
    </div>
  );
}
