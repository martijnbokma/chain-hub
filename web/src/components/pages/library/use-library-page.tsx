import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { analysisApi, libraryApi, overviewApi } from '@/lib/api';
import { hasSkillUpdate, isUpstreamOwnedSkill, resolveSkillUpstreamBrowseUrl } from '@/lib/skill-ownership';
import type {
  AnalysisItem,
  AssetRecord,
  DiscoveredAsset,
  OwnershipFilter
} from '@/types';
import type { AnalysisEntry } from './analyze-assets';
import {
  filterLibraryAssets,
  groupAssetsByKind,
  groupDiscoveredByEditor,
  parseKindParam,
  parseOwnershipParam,
  parseSelectedAssetParams
} from './asset-helpers';
import { ToastItemList } from './ToastItemList';
import { assetKey, useAnalysisReview } from './use-analysis-review';
import { useLibraryAiActions } from './use-library-ai-actions';
import { useLibraryAnalysis } from './use-library-analysis';
import { useLibraryAssetMutations } from './use-library-asset-mutations';
import { useLibraryCreateFlow } from './use-library-create-flow';
import { useLibraryInstallFlow } from './use-library-install-flow';
import { useUnsavedChangesGuard } from './use-unsaved-changes-guard';
import { useLibraryViewState } from './use-library-view-state';

/**
 * All Library page orchestration: selection and deep-link state, the library queries,
 * the AI/analysis/review sub-hooks and their effects. The page component only renders.
 */
export function useLibraryPage() {
  const queryClient = useQueryClient();
  const {
    searchParams,
    setSearchParams,
    selected,
    setSelected,
    masterView,
    setMasterView,
    activeFile,
    setActiveFile,
    removeOpen,
    setRemoveOpen,
    discoverOpen,
    setDiscoverOpen,
    forkOpen,
    setForkOpen,
    importProgress,
    setImportProgress,
    searchQuery,
    setSearchQuery,
    filterKind,
    setFilterKind,
    ownership,
    setOwnership,
    editorContent,
    setEditorContent,
    previewFilePath,
    setPreviewFilePath,
    autoAuditAsset,
    setAutoAuditAsset,
    updateResults,
    setUpdateResults,
    relinkTarget,
    setRelinkTarget,
    analyzeOpen,
    setAnalyzeOpen,
    view,
    setView,
    listAtTop,
    setListAtTop,
    listAtBottom,
    setListAtBottom
  } = useLibraryViewState();
  const analysis = useLibraryAnalysis();

  const createFlow = useLibraryCreateFlow({
    searchParams,
    setSearchParams,
    onCreated: setSelected
  });

  const installFlow = useLibraryInstallFlow({
    onInstalled: setSelected
  });

  const { setCreateOpenFromParams, seedCreateDraft } = createFlow;

  useEffect(() => {
    setCreateOpenFromParams(searchParams.get('create') === '1');
    setFilterKind(parseKindParam(searchParams.get('kind')));
    setOwnership(parseOwnershipParam(searchParams.get('ownership')));

    // Deep-link into the create flow: ?create=1&name=<slug>&intent=<text> seeds the draft,
    // e.g. from Learnings when a topic's reports have no skill yet.
    const seedName = searchParams.get('name');
    const seedIntent = searchParams.get('intent');
    if (searchParams.get('create') === '1' && (seedName || seedIntent)) {
      const parsedKind = parseKindParam(searchParams.get('kind'));
      seedCreateDraft({
        name: seedName ?? undefined,
        intent: seedIntent ?? undefined,
        kind: parsedKind === '__all__' ? undefined : parsedKind
      });
      const next = new URLSearchParams(searchParams);
      next.delete('name');
      next.delete('intent');
      setSearchParams(next, { replace: true });
      return;
    }

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
  }, [searchParams, setCreateOpenFromParams, setSearchParams, setSelected, setAutoAuditAsset, setFilterKind, setOwnership, seedCreateDraft]);

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

  const skillUpdateCheck = useQuery({
    queryKey: ['library', 'skill-updates'],
    queryFn: () => libraryApi.checkSkillUpdates(),
    enabled: filterKind === 'skills',
    staleTime: 5 * 60 * 1000
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
  }, [selected?.name, autoAuditAsset, setAutoAuditAsset]);

  useEffect(() => {
    if (selectedAsset.data) {
      setEditorContent(selectedAsset.data.content);
      if (autoAuditAsset && autoAuditAsset === selectedAsset.data.name) {
        setAutoAuditAsset(null);
        auditAssetMutateRef.current(selectedAsset.data.content);
      }
    }
  }, [selectedAsset.data, autoAuditAsset, setAutoAuditAsset, setEditorContent]);

  useEffect(() => {
    setPreviewFilePath(null);
  }, [selected?.kind, selected?.name, setPreviewFilePath]);

  const isDirty = selectedAsset.data !== undefined && editorContent !== selectedAsset.data.content;
  const { pendingSelection, setPendingSelection, requestSelection, navigationBlocker } =
    useUnsavedChangesGuard({
      isDirty,
      selected,
      onSameAsset: () => setMasterView('files'),
      onSelect: (next) => {
        setSelected(next);
        setMasterView('assets');
        setActiveFile('SKILL.md');
      }
    });

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    // Closing or reloading the tab would drop the edits; let the browser ask first.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const {
    saveAsset,
    renameAsset,
    discoverQuery,
    importAsset,
    importMultipleAssets,
    removeAsset,
    updateSkills,
    retryCheck,
    unlinkSkill,
    forkSkill,
    rescanAsset,
    convertKind
  } = useLibraryAssetMutations({
    selected,
    editorContent,
    loadedContent: selectedAsset.data?.content,
    discoverOpen,
    setSelected,
    setEditorContent,
    setRemoveOpen,
    setForkOpen,
    setUpdateResults,
    setImportProgress,
    resetAiResults
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

  const isUpstreamSkill = Boolean(selected) && isUpstreamOwnedSkill(selectedAsset.data?.provenance ?? null);
  const upstreamBrowseUrl = resolveSkillUpstreamBrowseUrl(selectedAsset.data?.provenance ?? null);

  // Live check results win over the persisted lock flag, which may predate the check.
  const skillUpdates = useMemo(() => {
    const byName = new Map<string, boolean>();
    for (const item of skillUpdateCheck.data?.results ?? []) {
      if (item.status === 'update_available' || item.status === 'up_to_date') {
        byName.set(item.name, item.status === 'update_available');
      }
    }
    for (const asset of library.data ?? []) {
      if (asset.kind === 'skills' && !byName.has(asset.name)) {
        byName.set(asset.name, hasSkillUpdate(asset.provenance));
      }
    }
    return byName;
  }, [skillUpdateCheck.data, library.data]);

  // Rich list for the update popover: live check results first, persisted lock flags as fallback.
  const skillUpdateItems = useMemo(() => {
    const items = new Map<string, { name: string; currentSha?: string | null; latestSha?: string | null }>();
    for (const item of skillUpdateCheck.data?.results ?? []) {
      if (item.status === 'update_available') {
        items.set(item.name, {
          name: item.name,
          currentSha: item.currentSha ?? null,
          latestSha: item.latestSha ?? null
        });
      }
    }
    for (const asset of library.data ?? []) {
      if (asset.kind === 'skills' && !items.has(asset.name) && hasSkillUpdate(asset.provenance)) {
        items.set(asset.name, {
          name: asset.name,
          currentSha: asset.provenance?.commitSha ?? null,
          latestSha: asset.provenance?.latestSha ?? null
        });
      }
    }
    return Array.from(items.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [skillUpdateCheck.data, library.data]);

  const forkTakenNames = useMemo(
    () =>
      new Set(
        (library.data ?? []).filter((asset) => asset.kind === selected?.kind).map((asset) => asset.name)
      ),
    [library.data, selected?.kind]
  );

  // Surface each distinct check outcome once; refetches of identical results stay silent.
  const checkToastSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    const data = skillUpdateCheck.data;
    if (!data) {
      return;
    }
    const signature = data.results
      .map((item) => `${item.name}:${item.status}:${item.latestSha ?? ''}`)
      .join('|');
    if (checkToastSignatureRef.current === signature) {
      return;
    }
    checkToastSignatureRef.current = signature;

    const updates = data.results.filter((item) => item.status === 'update_available');
    const failed = data.results.filter((item) => item.status === 'failed');

    if (updates.length > 0) {
      toast.info(
        updates.length === 1 ? '1 skill update available' : `${updates.length} skill updates available`,
        { description: <ToastItemList items={updates.map((item) => item.name)} />, duration: 6000 }
      );
    }
    if (failed.length > 0) {
      toast.warning(
        failed.length === 1 ? 'Could not check 1 skill' : `Could not check ${failed.length} skills`,
        {
          description: (
            <ToastItemList
              items={failed.map((item) => `${item.name}${item.error ? `: ${item.error}` : ''}`)}
              max={4}
            />
          ),
          duration: 8000
        }
      );
    }
  }, [skillUpdateCheck.data]);

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
  }, [kindSections, setListAtBottom, setListAtTop]);

  const isCandidateImporting = (candidate: DiscoveredAsset): boolean =>
    importMultipleAssets.isPending ||
    (importAsset.isPending &&
      importAsset.variables?.editorId === candidate.editorId &&
      importAsset.variables?.kind === candidate.kind &&
      importAsset.variables?.name === candidate.name);

  function handleDiscardChanges() {
    if (navigationBlocker.state === 'blocked') {
      navigationBlocker.proceed();
      return;
    }
    setSelected(pendingSelection ?? null);
    setMasterView('assets');
    setActiveFile('SKILL.md');
    setPendingSelection(undefined);
  }

  function handleKeepEditing() {
    if (navigationBlocker.state === 'blocked') {
      navigationBlocker.reset();
    }
    setPendingSelection(undefined);
  }

  function handleForkOpenExisting(name: string) {
    setForkOpen(false);
    if (selected) {
      requestSelection({ kind: selected.kind, name });
    }
  }

  function handleForkSubmit(name: string) {
    if (selected) {
      forkSkill.mutate({ kind: selected.kind, name: selected.name, as: name });
    }
  }

  function handlePreviewOpenChange(open: boolean) {
    if (!open) {
      setPreviewFilePath(null);
    }
  }

  function handleRelinkOpenChange(open: boolean) {
    if (!open) {
      setRelinkTarget(null);
    }
  }

  function handleUpdateResultsOpenChange(open: boolean) {
    if (!open) {
      setUpdateResults(null);
    }
  }

  return {
    // queries
    library,
    analysisReport,
    selectedAsset,
    skillFiles,
    discoverQuery,
    // selection / master-detail
    selected,
    masterView,
    setMasterView,
    activeFile,
    setActiveFile,
    requestSelection,
    pendingSelection,
    navigationBlocker,
    isDirty,
    // filters / list
    filterKind,
    searchQuery,
    setSearchQuery,
    ownership,
    setOwnershipSynced,
    filteredAssets,
    kindSections,
    skillUpdates,
    skillUpdateItems,
    listScrollRef,
    listAtTop,
    listAtBottom,
    view,
    setView,
    // editor + AI
    editorContent,
    setEditorContent,
    autoAuditAsset,
    kindAssessment,
    assetAudit,
    pendingAiEdit,
    approveAiEdit,
    discardAiEdit,
    reassessKind,
    auditAsset,
    improveAsset,
    fixDescriptionWithAi,
    forkAndFixDescription,
    isUpstreamSkill,
    upstreamBrowseUrl,
    // mutations
    saveAsset,
    renameAsset,
    removeAsset,
    updateSkills,
    retryCheck,
    unlinkSkill,
    forkSkill,
    rescanAsset,
    convertKind,
    importAsset,
    importMultipleAssets,
    // flows
    createFlow,
    installFlow,
    analysis,
    review,
    assetsByKey,
    // dialog state
    removeOpen,
    setRemoveOpen,
    discoverOpen,
    setDiscoverOpen,
    forkOpen,
    setForkOpen,
    forkTakenNames,
    importProgress,
    updateResults,
    relinkTarget,
    analyzeOpen,
    setAnalyzeOpen,
    previewFilePath,
    setPreviewFilePath,
    setRelinkTarget,
    groupedDiscovered,
    isCandidateImporting,
    // drift banner
    hasAgentsDrift,
    agentsDrift,
    // handlers used by the render layer
    handleAnalyze,
    handleRunAnalysisAgain,
    handleOpenAnalysisItem,
    handleOpenAnalyzedAsset,
    handleDiscardChanges,
    handleKeepEditing,
    handleForkOpenExisting,
    handleForkSubmit,
    handlePreviewOpenChange,
    handleRelinkOpenChange,
    handleUpdateResultsOpenChange
  };
}
