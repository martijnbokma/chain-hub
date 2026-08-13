import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { ensureExplicitDescription } from '@chain-hub/contracts';
import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isUpstreamOwnedSkill, resolveSkillUpstreamBrowseUrl } from '@/lib/skill-ownership';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { libraryApi, overviewApi, aiSettingsApi } from '@/lib/api';
import type {
  AssetKind,
  FilterKind,
  OwnershipFilter,
  AssetDetail,
  ClassifyAssetResult,
  AuditAssetResult,
  ImproveAssetResult,
  DiscoveredAsset,
  UpdateSkillsResult
} from '@/types';
import { AiEditPreviewDialog, type PendingAiEdit } from './library/AiEditPreviewDialog';
import { AssetDetailPanel } from './library/AssetDetailPanel';
import { AssetList } from './library/AssetList';
import {
  filterLibraryAssets,
  groupAssetsByKind,
  groupDiscoveredByEditor,
  parseKindParam,
  parseOwnershipParam
} from './library/asset-helpers';
import { CreateAssetDialog } from './library/CreateAssetDialog';
import { DiscoverDialog } from './library/DiscoverDialog';
import { InstallSkillDialog } from './library/InstallSkillDialog';
import { LibraryToolbar } from './library/LibraryToolbar';
import { RemoveAssetDialog } from './library/RemoveAssetDialog';
import { SkillFilePreviewDialog } from './library/SkillFilePreviewDialog';
import { useLibraryCreateFlow } from './library/use-library-create-flow';
import { useLibraryInstallFlow } from './library/use-library-install-flow';

export function LibraryPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<{ kind: AssetKind; name: string } | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<FilterKind>(() => parseKindParam(searchParams.get('kind')));
  const [ownership, setOwnership] = useState<OwnershipFilter>(() =>
    parseOwnershipParam(searchParams.get('ownership'))
  );
  const [editorContent, setEditorContent] = useState('');
  const [kindAssessment, setKindAssessment] = useState<ClassifyAssetResult | null>(null);
  const [assetAudit, setAssetAudit] = useState<AuditAssetResult | null>(null);
  const [pendingAiEdit, setPendingAiEdit] = useState<PendingAiEdit | null>(null);
  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null);

  function approveAiEdit() {
    if (!pendingAiEdit) {
      return;
    }
    setEditorContent(pendingAiEdit.after);
    setAssetAudit(null);
    setPendingAiEdit(null);
    toast.success('Applied — review and save');
  }

  function discardAiEdit() {
    setPendingAiEdit(null);
  }

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
  }, [searchParams, setCreateOpenFromParams]);

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

  useEffect(() => {
    if (selectedAsset.data) {
      setEditorContent(selectedAsset.data.content);
    }
  }, [selectedAsset.data]);

  useEffect(() => {
    setKindAssessment(null);
    setAssetAudit(null);
    setPreviewFilePath(null);
  }, [selected?.kind, selected?.name]);

  const saveAsset = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      const response = await libraryApi.update(selected.kind, selected.name, { content: editorContent });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Unable to update asset');
      }
      return response.json() as Promise<AssetDetail>;
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
      const response = await libraryApi.rename(selected.kind, selected.name, { name: nextName });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Unable to rename asset');
      }
      return response.json() as Promise<AssetDetail>;
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
      const response = await libraryApi.import({
        editorId: candidate.editorId,
        kind: candidate.kind,
        name: candidate.name
      });
      if (!response.ok) {
        throw new Error('Unable to import asset');
      }
      return response.json() as Promise<AssetDetail>;
    },
    onSuccess: (asset) => {
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Imported ${asset.kind}/${asset.name}`);
    },
    onError: () => {
      toast.error('Unable to import asset — it may already exist in the hub');
    }
  });

  const removeAsset = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      const response = await libraryApi.delete(selected.kind, selected.name);
      if (!response.ok) {
        throw new Error('Unable to delete asset');
      }
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
      const response = await libraryApi.updateSkills(name ? { name } : {});
      if (!response.ok) {
        throw new Error('Unable to update skills');
      }
      return response.json() as Promise<UpdateSkillsResult>;
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
      const response = await libraryApi.forkSkill({ name });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Unable to fork skill');
      }
      return response.json() as Promise<AssetDetail>;
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

  const reassessKind = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      const response = await aiSettingsApi.classifyAsset({
        kind: selected.kind,
        name: selected.name,
        content: editorContent
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Unable to reassess kind');
      }
      return response.json() as Promise<ClassifyAssetResult>;
    },
    onSuccess: (result) => {
      setKindAssessment(result);
      toast.success(
        result.matchesCurrent
          ? `Kind looks right (${result.recommendedKind})`
          : `Suggested kind: ${result.recommendedKind}`
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to reassess kind');
    }
  });

  const convertKind = useMutation({
    mutationFn: async (toKind: AssetKind) => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      if (editorContent !== selectedAsset.data?.content) {
        const saveResponse = await libraryApi.update(selected.kind, selected.name, {
          content: editorContent
        });
        if (!saveResponse.ok) {
          throw new Error('Save changes before converting, or retry');
        }
      }
      const response = await libraryApi.convert(selected.kind, selected.name, { toKind });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Unable to convert asset');
      }
      return response.json() as Promise<AssetDetail>;
    },
    onSuccess: (asset) => {
      setKindAssessment(null);
      setAssetAudit(null);
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

  const auditAsset = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      const response = await aiSettingsApi.auditAsset({
        kind: selected.kind,
        name: selected.name,
        content: editorContent
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Unable to audit asset');
      }
      return response.json() as Promise<AuditAssetResult>;
    },
    onSuccess: (result) => {
      setAssetAudit(result);
      toast.success(
        result.findings.length === 0
          ? 'Audit passed · no material findings'
          : `Audit ready · ${result.findings.length} findings`
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to audit asset');
    }
  });

  const improveAsset = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      if (!assetAudit || assetAudit.findings.length === 0) {
        throw new Error('Run an audit before applying improvements');
      }
      const response = await aiSettingsApi.improveAsset({
        kind: selected.kind,
        name: selected.name,
        content: editorContent,
        summary: assetAudit.summary,
        findings: assetAudit.findings
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Unable to improve asset');
      }
      return response.json() as Promise<ImproveAssetResult>;
    },
    onSuccess: (result) => {
      setPendingAiEdit({ label: 'Apply improvements', before: editorContent, after: result.content });
      toast.success('Improvements ready — review the diff');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to improve asset');
    }
  });

  const fixDescriptionWithAi = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      const response = await aiSettingsApi.improveAsset({
        kind: selected.kind,
        name: selected.name,
        content: editorContent,
        summary: 'Asset is missing a frontmatter description required by some editors.',
        findings: [
          {
            severity: 'high',
            title: 'Missing description',
            detail: 'Add a concise frontmatter `description` summarizing what this asset does and when to use it.'
          }
        ]
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Unable to generate description');
      }
      return response.json() as Promise<ImproveAssetResult>;
    },
    onSuccess: (result) => {
      setPendingAiEdit({ label: 'AI-drafted description', before: editorContent, after: result.content });
      toast.success('Description ready — review the diff');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to generate description');
    }
  });

  const forkAndFixDescription = useMutation({
    mutationFn: async (mode: 'heading' | 'ai') => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      const forkResponse = await libraryApi.forkSkill({ name: selected.name });
      if (!forkResponse.ok) {
        const text = await forkResponse.text();
        throw new Error(text || 'Unable to fork skill');
      }
      const forked = (await forkResponse.json()) as AssetDetail;

      const content =
        mode === 'heading'
          ? ensureExplicitDescription(forked.content, forked.name)
          : await (async () => {
              const improveResponse = await aiSettingsApi.improveAsset({
                kind: forked.kind,
                name: forked.name,
                content: forked.content,
                summary: 'Asset is missing a frontmatter description required by some editors.',
                findings: [
                  {
                    severity: 'high',
                    title: 'Missing description',
                    detail:
                      'Add a concise frontmatter `description` summarizing what this asset does and when to use it.'
                  }
                ]
              });
              if (!improveResponse.ok) {
                const payload = (await improveResponse.json().catch(() => null)) as { error?: string } | null;
                throw new Error(payload?.error || 'Unable to generate description');
              }
              const result = (await improveResponse.json()) as ImproveAssetResult;
              return result.content;
            })();

      return { forked, content };
    },
    onSuccess: ({ forked, content }) => {
      queryClient.setQueryData(['library', 'detail', forked.kind, forked.name], { ...forked, content });
      setSelected({ kind: forked.kind, name: forked.name });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Forked to skills/${forked.name} — description drafted, review and save`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to fork and fix description');
    }
  });

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
    importAsset.isPending &&
    importAsset.variables?.editorId === candidate.editorId &&
    importAsset.variables?.kind === candidate.kind &&
    importAsset.variables?.name === candidate.name;

  const listToolbar = (
    <LibraryToolbar
      assetCount={filteredAssets.length}
      filterKind={filterKind}
      isCompact={selected !== null}
      isUpdatingSkills={updateSkills.isPending}
      onCreate={() => createFlow.setCreateOpenSynced(true)}
      onDiscover={() => setDiscoverOpen(true)}
      onInstall={() => installFlow.setInstallOpen(true)}
      onOwnershipChange={setOwnershipSynced}
      onSearchQueryChange={setSearchQuery}
      onUpdateSkills={() => updateSkills.mutate(undefined)}
      ownership={ownership}
      searchQuery={searchQuery}
    />
  );

  if (library.isLoading) {
    return (
      <div className="flex h-[calc(100vh-108px+1rem)] min-w-0 flex-col overflow-hidden -mb-4 sm:-mb-6 sm:h-[calc(100vh-108px+1.5rem)]">
        {listToolbar}
        <PageSkeleton className="min-h-0 flex-1" variant="workspace" />
      </div>
    );
  }

  if (library.isError) {
    return (
      <div className="flex h-[calc(100vh-108px+1rem)] min-w-0 flex-col overflow-hidden -mb-4 sm:-mb-6 sm:h-[calc(100vh-108px+1.5rem)]">
        {listToolbar}
        <EmptyState description="The library index is temporarily unavailable." title="Unable to load library" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-108px+1rem)] min-w-0 flex-col overflow-hidden -mb-4 sm:-mb-6 sm:h-[calc(100vh-108px+1.5rem)]">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
                disabled={installFlow.migrateAgentsSkills.isPending}
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
            'grid min-h-0 min-w-0 flex-1 gap-4 overflow-hidden',
            selected ? 'xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]' : 'grid-cols-1'
          )}
        >
          <div className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden', selected && 'hidden xl:flex')}>
            {listToolbar}
            <div
              className={cn(
                'fade-scrollbar-safe-y min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto',
                !listAtTop && 'fade-top',
                !listAtBottom && 'fade-bottom'
              )}
              ref={listScrollRef}
            >
              <AssetList
                filterKind={filterKind}
                kindSections={kindSections}
                onSelect={(asset) => setSelected({ kind: asset.kind as AssetKind, name: asset.name })}
                selected={selected}
              />
            </div>
          </div>

          {selected ? (
            <AssetDetailPanel
              assetAudit={assetAudit}
              author={selectedAsset.data?.author}
              editorContent={editorContent}
              isAuditing={auditAsset.isPending}
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
              onBack={() => setSelected(null)}
              onConvertKind={(toKind) => convertKind.mutate(toKind)}
              onEditorChange={setEditorContent}
              onFixDescriptionWithAi={() => fixDescriptionWithAi.mutate()}
              onFork={() => forkSkill.mutate(selected.name)}
              onForkAndFixHeading={() => forkAndFixDescription.mutate('heading')}
              onForkAndFixWithAi={() => forkAndFixDescription.mutate('ai')}
              onImproveAsset={() => improveAsset.mutate()}
              onReassessKind={() => reassessKind.mutate()}
              onRename={(nextName) => renameAsset.mutate(nextName)}
              onPreviewFile={setPreviewFilePath}
              onRequestDelete={() => setRemoveOpen(true)}
              onSave={() => saveAsset.mutate()}
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
          isCandidateImporting={isCandidateImporting}
          isLoading={discoverQuery.isLoading}
          onImport={(candidate) => importAsset.mutate(candidate)}
          onOpenChange={setDiscoverOpen}
          open={discoverOpen}
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
