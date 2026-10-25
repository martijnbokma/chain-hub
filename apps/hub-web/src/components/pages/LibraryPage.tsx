import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker, useSearchParams } from 'react-router-dom';
import { ArrowRight, Download, FolderTree } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hasSkillUpdate, isUpstreamOwnedSkill, resolveSkillUpstreamBrowseUrl } from '@/lib/skill-ownership';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { analysisApi, errorMessage, libraryApi, overviewApi } from '@/lib/api';
import type {
  AnalysisItem,
  AssetKind,
  AssetRecord,
  FilterKind,
  OwnershipFilter,
  DiscoveredAsset,
  SkillBatchItemResult
} from '@/types';
import type { AnalysisEntry } from './library/analyze-assets';
import { AnalysisReview } from './library/AnalysisReview';
import { AssetDetailPanel } from './library/AssetDetailPanel';
import { AssetFileManager } from './library/AssetFileManager';
import { AssetList } from './library/AssetList';
import { LibraryDialogs } from './library/LibraryDialogs';
import {
  filterLibraryAssets,
  groupAssetsByKind,
  groupDiscoveredByEditor,
  parseKindParam,
  parseOwnershipParam,
  parseSelectedAssetParams
} from './library/asset-helpers';
import { LibraryToolbar } from './library/LibraryToolbar';
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
  const [forkOpen, setForkOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<FilterKind>(() => parseKindParam(searchParams.get('kind')));
  const [ownership, setOwnership] = useState<OwnershipFilter>(() =>
    parseOwnershipParam(searchParams.get('ownership'))
  );
  const [editorContent, setEditorContent] = useState('');
  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null);
  const [autoAuditAsset, setAutoAuditAsset] = useState<string | null>(null);
  const [updateResults, setUpdateResults] = useState<SkillBatchItemResult[] | null>(null);
  const [relinkTarget, setRelinkTarget] = useState<string | null>(null);
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
      const changedOrFailed = result.results.some(
        (item) => item.status === 'updated' || item.status === 'migrated' || item.status === 'failed'
      );

      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['library', 'skill-updates'] });
      void queryClient.invalidateQueries({ queryKey: ['issues'] });
      if (selected) {
        void queryClient.invalidateQueries({
          queryKey: ['library', 'detail', selected.kind, selected.name]
        });
      }

      if (!changedOrFailed) {
        toast.success('All skills already up to date');
        return;
      }

      setUpdateResults(result.results);
    },
    onError: () => {
      toast.error('Unable to update skills from upstream');
    }
  });

  const retryCheck = useMutation({
    mutationFn: async (name: string) => libraryApi.checkSkillUpdates({ name, force: true }),
    onSuccess: (result, name) => {
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['library', 'skill-updates'] });
      void queryClient.invalidateQueries({ queryKey: ['issues'] });
      const item = result.results.find((entry) => entry.name === name);
      if (item?.status === 'failed') {
        toast.warning(`Check still failing for ${name}: ${item.error ?? 'unknown error'}`);
      } else {
        toast.success(
          item?.status === 'update_available' ? `Update available for ${name}` : `${name} is up to date`
        );
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to check skill'));
    }
  });

  const unlinkSkill = useMutation({
    mutationFn: async (name: string) => libraryApi.unlinkSkill(name),
    onSuccess: (_result, name) => {
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['library', 'skill-updates'] });
      void queryClient.invalidateQueries({ queryKey: ['issues'] });
      if (selected) {
        void queryClient.invalidateQueries({
          queryKey: ['library', 'detail', selected.kind, selected.name]
        });
      }
      toast.success(`${name} is now a local, editable skill`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to unlink skill'));
    }
  });

  const forkSkill = useMutation({
    mutationFn: async (target: { kind: AssetKind; name: string; as?: string }) => {
      return libraryApi.forkSkill(target);
    },
    onSuccess: (asset) => {
      setForkOpen(false);
      setSelected({ kind: asset.kind, name: asset.name });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['library', 'detail', asset.kind, asset.name] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Forked to ${asset.kind}/${asset.name} — safe to edit`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to fork asset');
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
      onUpdateSkill={(name) => updateSkills.mutate(name)}
      onViewChange={setView}
      ownership={ownership}
      reviewOpenCount={analysisReport.data?.items.filter((item) => item.status === 'open').length ?? 0}
      searchQuery={searchQuery}
      skillUpdateItems={skillUpdateItems}
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
                      className="group h-6 shrink-0 gap-1 px-2 text-xs font-medium"
                      onClick={() => setMasterView('files')}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <FolderTree className="size-3" />
                      Files ({skillFiles.data?.files?.filter((f) => !f.isDirectory).length ?? 0})
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
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
                      skillUpdates={skillUpdates}
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
              isRetryingCheck={retryCheck.isPending}
              isSaving={saveAsset.isPending}
              isUnlinking={unlinkSkill.isPending}
              isUpdating={updateSkills.isPending}
              isUpstreamSkill={isUpstreamSkill}
              kindAssessment={kindAssessment}
              onAuditAsset={() => auditAsset.mutate()}
              onBack={() => requestSelection(null)}
              onConvertKind={(toKind) => convertKind.mutate(toKind)}
              onEditorChange={setEditorContent}
              onFixDescriptionWithAi={() => fixDescriptionWithAi.mutate()}
              onFork={() => setForkOpen(true)}
              onForkAndFixHeading={() => forkAndFixDescription.mutate('heading')}
              onForkAndFixWithAi={() => forkAndFixDescription.mutate('ai')}
              onImproveAsset={() => improveAsset.mutate()}
              onOpenFileManager={() => setMasterView('files')}
              onPreviewFile={setPreviewFilePath}
              onReassessKind={() => reassessKind.mutate()}
              onRelink={() => setRelinkTarget(selected.name)}
              onRename={(nextName) => renameAsset.mutate(nextName)}
              onRequestDelete={() => setRemoveOpen(true)}
              onRetryCheck={() => retryCheck.mutate(selected.name)}
              onSave={() => saveAsset.mutate()}
              onSelectFile={(filePath) => setActiveFile(filePath)}
              onUnlink={() => unlinkSkill.mutate(selected.name)}
              onUpdateFromSource={() => updateSkills.mutate(selected.name)}
              provenance={selectedAsset.data?.provenance}
              selected={selected}
              skillFiles={skillFiles.data?.files ?? []}
              updateAvailable={skillUpdates.get(selected.name) ?? false}
              upstreamBrowseUrl={upstreamBrowseUrl}
            />
          ) : null}
        </div>

        <LibraryDialogs
          analysis={analysis}
          analyzeOpen={analyzeOpen}
          createFlow={createFlow}
          discoverLoading={discoverQuery.isLoading}
          discoverOpen={discoverOpen}
          discardOpen={pendingSelection !== undefined || navigationBlocker.state === 'blocked'}
          forkOpen={forkOpen}
          forkTakenNames={forkTakenNames}
          groupedDiscovered={groupedDiscovered}
          importProgress={importProgress}
          installFlow={installFlow}
          isCandidateImporting={isCandidateImporting}
          isDeleting={removeAsset.isPending}
          isForking={forkSkill.isPending}
          isImportingAll={importMultipleAssets.isPending}
          onAnalyzeOpenChange={setAnalyzeOpen}
          onApproveAiEdit={approveAiEdit}
          onDiscardAiEdit={discardAiEdit}
          onDiscardChanges={() => {
            if (navigationBlocker.state === 'blocked') {
              navigationBlocker.proceed();
              return;
            }
            setSelected(pendingSelection ?? null);
            setMasterView('assets');
            setActiveFile('SKILL.md');
            setPendingSelection(undefined);
          }}
          onDiscoverOpenChange={setDiscoverOpen}
          onForkOpenChange={setForkOpen}
          onForkOpenExisting={(name) => {
            setForkOpen(false);
            if (selected) {
              requestSelection({ kind: selected.kind, name });
            }
          }}
          onForkSubmit={(name) => {
            if (selected) {
              forkSkill.mutate({ kind: selected.kind, name: selected.name, as: name });
            }
          }}
          onImportAll={(candidates) => importMultipleAssets.mutate(candidates)}
          onImportCandidate={(candidate) => importAsset.mutate(candidate)}
          onKeepEditing={() => {
            if (navigationBlocker.state === 'blocked') {
              navigationBlocker.reset();
            }
            setPendingSelection(undefined);
          }}
          onOpenAnalyzedAsset={handleOpenAnalyzedAsset}
          onPreviewOpenChange={(open) => {
            if (!open) {
              setPreviewFilePath(null);
            }
          }}
          onRelinkOpenChange={(open) => {
            if (!open) {
              setRelinkTarget(null);
            }
          }}
          onRemoveConfirm={() => removeAsset.mutate()}
          onRemoveOpenChange={setRemoveOpen}
          onRunAnalysisAgain={handleRunAnalysisAgain}
          onUpdateResultsOpenChange={(open) => {
            if (!open) {
              setUpdateResults(null);
            }
          }}
          pendingAiEdit={pendingAiEdit}
          previewFilePath={previewFilePath}
          relinkTarget={relinkTarget}
          removeOpen={removeOpen}
          review={review}
          selected={selected}
          totalAssets={library.data?.length ?? 0}
          updateResults={updateResults}
        />
      </section>
    </div>
  );
}

/** Compact toast list: a few items inline, longer lists capped vertical with "+N more". */
function ToastItemList({ items, max = 6 }: { items: string[]; max?: number }) {
  if (items.length <= 3) {
    return <>{items.join(', ')}</>;
  }
  const shown = items.slice(0, max);
  const hidden = items.length - shown.length;
  return (
    <span className="flex flex-col gap-0.5">
      {shown.map((item) => (
        <span key={item}>{item}</span>
      ))}
      {hidden > 0 ? <span>+{hidden} more</span> : null}
    </span>
  );
}
