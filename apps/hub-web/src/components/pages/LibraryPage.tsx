import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Sparkles, Download, MoreHorizontal, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { isUpstreamOwnedSkill, resolveSkillUpstreamBrowseUrl } from '@/lib/skill-ownership';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ShellToolbar } from '@/components/layout/ShellToolbar';
import { libraryApi, overviewApi, aiSettingsApi } from '@/lib/api';
import type {
  AssetKind,
  FilterKind,
  AssetRecord,
  AssetDetail,
  DiscoveredAsset,
  DraftPromptResult,
  InstallSkillResult,
  MigrateAgentsSkillsResult,
  UpdateSkillsResult
} from '@/types';
import { AssetDetailPanel } from './library/AssetDetailPanel';
import { AssetList } from './library/AssetList';
import { type BrowsedSkillFolder, readBrowsedSkillFolder } from './library/asset-helpers';
import { CreateAssetDialog, type DraftKindChoice } from './library/CreateAssetDialog';
import { DiscoverDialog } from './library/DiscoverDialog';
import { InstallSkillDialog } from './library/InstallSkillDialog';
import { RemoveAssetDialog } from './library/RemoveAssetDialog';

export function LibraryPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<{ kind: AssetKind; name: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(searchParams.get('create') === '1');
  const [installOpen, setInstallOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<FilterKind>('__all__');
  const [installMode, setInstallMode] = useState<'path' | 'repo'>('path');
  const [installPath, setInstallPath] = useState('');
  const [installRepo, setInstallRepo] = useState('');
  const [installSubdir, setInstallSubdir] = useState('');
  const [installName, setInstallName] = useState('');
  const [installForce, setInstallForce] = useState(false);
  const [browsedFolder, setBrowsedFolder] = useState<BrowsedSkillFolder | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [draftName, setDraftName] = useState('');
  const [draftKindChoice, setDraftKindChoice] = useState<DraftKindChoice>('auto');
  const [draftKind, setDraftKind] = useState<AssetKind>('skills');
  const [kindReason, setKindReason] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('# New Asset\n');
  const [draftIntent, setDraftIntent] = useState('');
  const [editorContent, setEditorContent] = useState('');

  const handleDraftKindChoiceChange = (value: DraftKindChoice) => {
    setDraftKindChoice(value);
    setKindReason(null);
    if (value !== 'auto') {
      setDraftKind(value);
    }
  };

  const resetCreateDraft = () => {
    setDraftName('');
    setDraftContent('# New Asset\n');
    setDraftIntent('');
    setDraftKindChoice('auto');
    setDraftKind('skills');
    setKindReason(null);
  };

  const syncCreateParam = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) {
      next.set('create', '1');
    } else {
      next.delete('create');
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    setCreateOpen(searchParams.get('create') === '1');
  }, [searchParams]);

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

  useEffect(() => {
    if (selectedAsset.data) {
      setEditorContent(selectedAsset.data.content);
    }
  }, [selectedAsset.data]);

  const createAsset = useMutation({
    mutationFn: async () => {
      let response: Response;
      try {
        response = await libraryApi.create({
          kind: draftKind,
          name: draftName,
          content: draftContent
        });
      } catch {
        throw new Error('Hub server is unreachable. Run `bun run dev` or `chain hub` and try again.');
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || `Unable to create asset (${response.status})`);
      }
      return response.json() as Promise<AssetDetail>;
    },
    onSuccess: (asset) => {
      resetCreateDraft();
      setSelected({ kind: asset.kind as AssetKind, name: asset.name });
      setCreateOpen(false);
      syncCreateParam(false);
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      toast.success(`Created ${asset.kind}/${asset.name}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to create asset');
    }
  });

  const draftPromptWithAi = useMutation({
    mutationFn: async () => {
      const response = await aiSettingsApi.draftPrompt({
        intent: draftIntent.trim(),
        kind: draftKindChoice,
        name: draftName.trim() || undefined
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Unable to draft asset. Check Settings → AI.');
      }
      return response.json() as Promise<DraftPromptResult>;
    },
    onSuccess: (result) => {
      setDraftContent(result.content);
      setDraftKind(result.recommendedKind);
      if (draftKindChoice === 'auto') {
        setKindReason(result.reason ?? `Best fit as ${result.recommendedKind}`);
      } else {
        setKindReason(null);
      }
      if (!draftName.trim() && result.suggestedName) {
        setDraftName(result.suggestedName);
      }
      toast.success(
        draftKindChoice === 'auto'
          ? `Draft ready as ${result.recommendedKind} — review and create`
          : 'Draft ready — review and create'
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to draft asset');
    }
  });

  const saveAsset = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      const response = await libraryApi.update(selected.kind, selected.name, { content: editorContent });
      if (!response.ok) {
        throw new Error('Unable to update asset');
      }
      return response.json() as Promise<AssetDetail>;
    },
    onSuccess: (asset) => {
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['library', 'detail', asset.kind, asset.name] });
      toast.success(`Saved ${asset.kind}/${asset.name}`);
    },
    onError: () => {
      toast.error('Unable to save asset');
    }
  });

  const discoverQuery = useQuery({
    queryKey: ['library', 'discover'],
    queryFn: () => libraryApi.discover(),
    enabled: discoverOpen
  });

  const importAsset = useMutation({
    mutationFn: async (candidate: DiscoveredAsset) => {
      const response = await libraryApi.import({ editorId: candidate.editorId, kind: candidate.kind, name: candidate.name });
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

  const installSkill = useMutation({
    mutationFn: async () => {
      const response =
        installMode === 'path' && browsedFolder
          ? await libraryApi.installSkillBundle({
              files: browsedFolder.files,
              name: installName.trim() || browsedFolder.label || undefined,
              force: installForce
            })
          : await libraryApi.installSkill({
              path: installMode === 'path' ? installPath.trim() || undefined : undefined,
              repo: installMode === 'repo' ? installRepo.trim() || undefined : undefined,
              subdir: installSubdir.trim() || undefined,
              name: installName.trim() || undefined,
              force: installForce
            });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Unable to install skill');
      }
      return response.json() as Promise<InstallSkillResult>;
    },
    onSuccess: (result) => {
      setInstallOpen(false);
      setInstallPath('');
      setInstallRepo('');
      setInstallSubdir('');
      setInstallName('');
      setInstallForce(false);
      setBrowsedFolder(null);
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
      setSelected({ kind: 'skills', name: result.asset.name });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Installed skills/${result.asset.name}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to install skill');
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
      const updated = result.results.filter((item) => item.status === 'updated').length;
      const skipped = result.results.filter((item) => item.status === 'skipped').length;
      const failed = result.results.filter((item) => item.status === 'failed').length;
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      if (selected) {
        void queryClient.invalidateQueries({ queryKey: ['library', 'detail', selected.kind, selected.name] });
      }
      toast.success(`Update finished: ${updated} updated, ${skipped} skipped, ${failed} failed`);
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

  const isUpstreamSkill =
    selected?.kind === 'skills' && isUpstreamOwnedSkill(selectedAsset.data?.provenance ?? null);
  const upstreamBrowseUrl = resolveSkillUpstreamBrowseUrl(selectedAsset.data?.provenance ?? null);

  const migrateAgentsSkills = useMutation({
    mutationFn: async () => {
      const response = await libraryApi.migrateAgentsSkills({});
      if (!response.ok) {
        throw new Error('Unable to migrate agents skills');
      }
      return response.json() as Promise<MigrateAgentsSkillsResult>;
    },
    onSuccess: (result) => {
      const migrated = result.results.filter((item) => item.status === 'migrated').length;
      const skipped = result.results.filter((item) => item.status === 'skipped').length;
      const failed = result.results.filter((item) => item.status === 'failed').length;
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Agents migrate: ${migrated} migrated, ${skipped} skipped, ${failed} failed`);
    },
    onError: () => {
      toast.error('Unable to migrate from ~/.agents/.skill-lock.json');
    }
  });

  const filteredAssets = useMemo(() => {
    return (library.data ?? []).filter((asset) => {
      const matchesKind = filterKind === '__all__' || asset.kind === filterKind;
      const matchesQuery =
        searchQuery.trim().length === 0 ||
        `${asset.name} ${asset.relativePath} ${asset.kind}`.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesKind && matchesQuery;
    });
  }, [filterKind, library.data, searchQuery]);

  const grouped = useMemo(() => {
    return filteredAssets.reduce<Record<string, AssetRecord[]>>((accumulator, asset) => {
      accumulator[asset.kind] ??= [];
      accumulator[asset.kind].push(asset);
      return accumulator;
    }, {});
  }, [filteredAssets]);

  const groupedDiscovered = useMemo(() => {
    return (discoverQuery.data ?? []).reduce<Record<string, DiscoveredAsset[]>>((accumulator, candidate) => {
      accumulator[candidate.editorLabel] ??= [];
      accumulator[candidate.editorLabel].push(candidate);
      return accumulator;
    }, {});
  }, [discoverQuery.data]);

  const kindSections = Object.entries(grouped);
  const agentsDrift = overview.data?.agentsSkillsDrift;
  const hasAgentsDrift = (agentsDrift?.missingCount ?? 0) > 0;

  const installSubmitDisabled =
    installMode === 'path' ? !browsedFolder && installPath.trim().length === 0 : installRepo.trim().length === 0;

  const isCandidateImporting = (candidate: DiscoveredAsset): boolean =>
    importAsset.isPending &&
    importAsset.variables?.editorId === candidate.editorId &&
    importAsset.variables?.kind === candidate.kind &&
    importAsset.variables?.name === candidate.name;

  const handleBrowseFiles = (fileList: FileList): void => {
    void readBrowsedSkillFolder(fileList)
      .then((folder) => {
        setBrowsedFolder(folder);
        setInstallPath('');
        if (!installName.trim()) {
          setInstallName(folder.label);
        }
        toast.success(`Selected ${folder.label} (${folder.files.length} files)`);
      })
      .catch((error: Error) => {
        setBrowsedFolder(null);
        toast.error(error.message || 'Unable to read folder');
      });
  };

  const toolbar = (
    <ShellToolbar>
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <h1 className="text-sm font-semibold tracking-tight text-foreground">Assets</h1>
          <Badge variant="default">{filteredAssets.length}</Badge>
        </div>

        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search assets"
            className="h-9 pl-9"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search assets"
            value={searchQuery}
          />
        </div>

        <Select
          aria-label="Filter by kind"
          className="w-28 shrink-0 md:hidden"
          onChange={(event) => setFilterKind(event.target.value as FilterKind)}
          value={filterKind}
        >
          <option value="__all__">All</option>
          <option value="skills">Skills</option>
          <option value="agents">Agents</option>
          <option value="workflows">Workflows</option>
          <option value="rules">Rules</option>
          <option value="prompts">Prompts</option>
        </Select>

        <Button
          className="w-fit shrink-0"
          onClick={() => {
            setCreateOpen(true);
            syncCreateParam(true);
          }}
          size="sm"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Create</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label="More library actions"
                className="shrink-0"
                size="icon-sm"
                variant="secondary"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem onClick={() => setInstallOpen(true)}>
              <Download className="size-4" />
              Install skill
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={updateSkills.isPending}
              onClick={() => updateSkills.mutate(undefined)}
            >
              <RefreshCw className="size-4" />
              {updateSkills.isPending ? 'Updating…' : 'Update skills'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDiscoverOpen(true)}>
              <Sparkles className="size-4" />
              Discover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </ShellToolbar>
  );

  if (library.isLoading) {
    return (
      <>
        {toolbar}
        <PageSkeleton className="h-[calc(100vh-108px)]" variant="workspace" />
      </>
    );
  }

  if (library.isError) {
    return (
      <>
        {toolbar}
        <EmptyState description="The library index is temporarily unavailable." title="Unable to load library" />
      </>
    );
  }

  return (
    <>
      {toolbar}
      <div className="flex h-[calc(100vh-108px)] flex-col">
      <Tabs
        className="mb-4 hidden shrink-0 gap-0 border-b border-border pb-3 md:block"
        onValueChange={(value) => setFilterKind(value as FilterKind)}
        value={filterKind}
      >
        <TabsList>
          <TabsTrigger value="__all__">All</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
        </TabsList>
      </Tabs>
      <section className="flex min-h-0 flex-1 flex-col">
      {hasAgentsDrift && agentsDrift ? (
        <div className="shrink-0 px-0 pb-3">
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
              disabled={migrateAgentsSkills.isPending}
              onClick={() => migrateAgentsSkills.mutate()}
              size="sm"
            >
              {migrateAgentsSkills.isPending ? 'Importing…' : 'Import into Hub'}
            </Button>
          </Alert>
        </div>
      ) : null}
      <div
        className={cn(
          'grid min-h-0 flex-1 gap-4',
          selected ? 'xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]' : 'grid-cols-1'
        )}
      >
        <div className={cn('min-h-0 overflow-y-auto', selected && 'hidden xl:block')}>
          <AssetList
            filterKind={filterKind}
            kindSections={kindSections}
            onSelect={(asset) => setSelected({ kind: asset.kind as AssetKind, name: asset.name })}
            selected={selected}
          />
        </div>

        {selected ? (
          <AssetDetailPanel
            editorContent={editorContent}
            isDeleting={removeAsset.isPending}
            isForking={forkSkill.isPending}
            isSaving={saveAsset.isPending}
            isUpdating={updateSkills.isPending}
            isUpstreamSkill={isUpstreamSkill}
            onBack={() => setSelected(null)}
            onEditorChange={setEditorContent}
            onFork={() => forkSkill.mutate(selected.name)}
            onRequestDelete={() => setRemoveOpen(true)}
            onSave={() => saveAsset.mutate()}
            onUpdateFromSource={() => updateSkills.mutate(selected.name)}
            provenance={selectedAsset.data?.provenance}
            selected={selected}
            upstreamBrowseUrl={upstreamBrowseUrl}
          />
        ) : null}
      </div>

      <CreateAssetDialog
        draftContent={draftContent}
        draftIntent={draftIntent}
        draftKindChoice={draftKindChoice}
        draftName={draftName}
        isDrafting={draftPromptWithAi.isPending}
        isSubmitting={createAsset.isPending}
        kindReason={kindReason}
        onDraftContentChange={setDraftContent}
        onDraftIntentChange={setDraftIntent}
        onDraftKindChoiceChange={handleDraftKindChoiceChange}
        onDraftNameChange={setDraftName}
        onDraftWithAi={() => draftPromptWithAi.mutate()}
        onOpenChange={(open) => {
          setCreateOpen(open);
          syncCreateParam(open);
        }}
        onSubmit={() => createAsset.mutate()}
        open={createOpen}
        resolvedKind={draftKind}
      />

      <InstallSkillDialog
        browsedFolder={browsedFolder}
        folderInputRef={folderInputRef}
        installForce={installForce}
        installMode={installMode}
        installName={installName}
        installPath={installPath}
        installRepo={installRepo}
        installSubdir={installSubdir}
        isInstalling={installSkill.isPending}
        isMigrating={migrateAgentsSkills.isPending}
        onBrowseFiles={handleBrowseFiles}
        onInstallForceChange={setInstallForce}
        onInstallModeChange={(mode) => {
          setInstallMode(mode);
          setBrowsedFolder(null);
        }}
        onInstallNameChange={setInstallName}
        onInstallPathChange={(value) => {
          setBrowsedFolder(null);
          setInstallPath(value);
        }}
        onInstallRepoChange={setInstallRepo}
        onInstallSubdirChange={setInstallSubdir}
        onMigrate={() => migrateAgentsSkills.mutate()}
        onOpenChange={setInstallOpen}
        onSubmit={() => installSkill.mutate()}
        open={installOpen}
        submitDisabled={installSubmitDisabled}
      />

      <RemoveAssetDialog
        isDeleting={removeAsset.isPending}
        onConfirm={() => removeAsset.mutate()}
        onOpenChange={setRemoveOpen}
        open={removeOpen}
        selected={selected}
      />

      <DiscoverDialog
        groupedDiscovered={groupedDiscovered}
        isCandidateImporting={isCandidateImporting}
        isLoading={discoverQuery.isLoading}
        onImport={(candidate) => importAsset.mutate(candidate)}
        onOpenChange={setDiscoverOpen}
        open={discoverOpen}
      />
      </section>
      </div>
    </>
  );
}
