import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Trash2,
  Sparkles,
  ArrowLeft,
  Bot,
  Workflow,
  ScrollText,
  Download,
  ExternalLink,
  FolderOpen,
  GitFork,
  RefreshCw,
  MoreHorizontal,
  type LucideIcon
} from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { isUpstreamOwnedSkill, resolveSkillUpstreamBrowseUrl } from '@/lib/skill-ownership';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ShellToolbar } from '@/components/layout/ShellToolbar';
import { libraryApi, overviewApi } from '@/lib/api';
import type {
  AssetKind,
  FilterKind,
  AssetRecord,
  AssetDetail,
  DiscoveredAsset,
  InstallSkillBundleInput,
  InstallSkillResult,
  MigrateAgentsSkillsResult,
  SkillLockEntry,
  UpdateSkillsResult
} from '@/types';

const MarkdownSourceEditor = React.lazy(async () => {
  const module = await import('@/components/common/MarkdownSourceEditor');
  return { default: module.MarkdownSourceEditor };
});

type BrowsedSkillFolder = {
  label: string;
  files: InstallSkillBundleInput['files'];
};

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function readBrowsedSkillFolder(fileList: FileList): Promise<BrowsedSkillFolder> {
  const files = Array.from(fileList);
  if (files.length === 0) {
    throw new Error('No files selected');
  }

  const relativePaths = files.map((file) => file.webkitRelativePath || file.name);
  const rootName = relativePaths[0]?.split('/')[0] || 'skill';
  const payloadFiles: InstallSkillBundleInput['files'] = [];

  for (const file of files) {
    const relative = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
    const withoutRoot = relative.startsWith(`${rootName}/`) ? relative.slice(rootName.length + 1) : relative;
    if (!withoutRoot || withoutRoot.endsWith('/')) {
      continue;
    }
    payloadFiles.push({
      path: withoutRoot,
      contentBase64: await fileToBase64(file)
    });
  }

  if (!payloadFiles.some((file) => file.path === 'SKILL.md' || file.path.endsWith('/SKILL.md'))) {
    throw new Error('Selected folder must contain SKILL.md');
  }

  return { label: rootName, files: payloadFiles };
}

const KIND_META: Record<AssetKind, { label: string; icon: LucideIcon }> = {
  skills: { label: 'Skill', icon: Sparkles },
  agents: { label: 'Agent', icon: Bot },
  workflows: { label: 'Workflow', icon: Workflow },
  rules: { label: 'Rule', icon: ScrollText }
};

function resolveKindMeta(kind: string): { label: string; icon: LucideIcon } {
  if (kind === 'skills' || kind === 'agents' || kind === 'workflows' || kind === 'rules') {
    return KIND_META[kind];
  }
  return KIND_META.skills;
}

function formatSkillSource(provenance: SkillLockEntry | null | undefined): string {
  if (!provenance) {
    return 'Local hub (no lock entry)';
  }

  if (provenance.source.startsWith('upload://')) {
    return 'Uploaded via dashboard';
  }

  if (provenance.sourceType === 'git') {
    return provenance.subdir ? `${provenance.source} · ${provenance.subdir}` : provenance.source;
  }

  return provenance.source;
}

function formatSkillSourceType(provenance: SkillLockEntry | null | undefined): string {
  if (!provenance) {
    return 'local';
  }
  if (provenance.source.startsWith('upload://')) {
    return 'upload';
  }
  return provenance.sourceType;
}

interface AssetCardProps {
  asset: AssetRecord;
  selected: boolean;
  compact?: boolean;
  onSelect: () => void;
}

function AssetCard({ asset, selected, compact = false, onSelect }: AssetCardProps) {
  const meta = resolveKindMeta(asset.kind);
  const Icon = meta.icon;
  const sourceLabel =
    asset.kind === 'skills' ? formatSkillSource(asset.provenance) : null;

  return (
    <button
      className={cn(
        'group grid w-full gap-3 rounded-xl border border-border bg-card text-left shadow-card transition-colors',
        'hover:border-primary/25 hover:bg-muted/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected && 'border-primary/40 bg-primary/5 ring-1 ring-primary/15',
        compact ? 'gap-2 p-3' : 'p-4'
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors',
            selected && 'bg-primary/10 text-primary'
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{asset.name}</span>
            <Badge variant="accent">{meta.label}</Badge>
            {asset.kind === 'skills' ? (
              <Badge variant="default">{formatSkillSourceType(asset.provenance)}</Badge>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{asset.relativePath}</p>
          {sourceLabel ? (
            <p className="truncate text-xs text-muted-foreground" title={sourceLabel}>
              Source · {sourceLabel}
            </p>
          ) : null}
          {compact ? null : (
            <p className="text-xs text-muted-foreground">
              Updated {new Date(asset.updatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        {compact ? (
          <time
            className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground"
            dateTime={asset.updatedAt}
          >
            {new Date(asset.updatedAt).toLocaleDateString()}
          </time>
        ) : null}
      </div>
    </button>
  );
}

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
  const [draftKind, setDraftKind] = useState<AssetKind>('skills');
  const [draftContent, setDraftContent] = useState('# New Asset\n');
  const [editorContent, setEditorContent] = useState('');

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
      const response = await libraryApi.create({
        kind: draftKind,
        name: draftName,
        content: draftContent
      });
      if (!response.ok) {
        throw new Error('Unable to create asset');
      }
      return response.json() as Promise<AssetDetail>;
    },
    onSuccess: (asset) => {
      setDraftName('');
      setDraftContent('# New Asset\n');
      setSelected({ kind: asset.kind as AssetKind, name: asset.name });
      setCreateOpen(false);
      syncCreateParam(false);
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Created ${asset.kind}/${asset.name}`);
    },
    onError: () => {
      toast.error('Unable to create asset');
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
        </Select>

        <Tabs
          className="hidden shrink-0 gap-0 md:block"
          onValueChange={(value) => setFilterKind(value as FilterKind)}
          value={filterKind}
        >
          <TabsList>
            <TabsTrigger value="__all__">All</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
          </TabsList>
        </Tabs>

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
      <section className="flex h-[calc(100vh-108px)] flex-col">
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
          {kindSections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              No assets match the current search and filter.
            </div>
          ) : (
            <div className="grid gap-6 pb-2">
              {kindSections.length > 1 && filterKind === '__all__' ? (
                <div className="flex flex-wrap gap-2">
                  {kindSections.map(([kind, items]) => (
                    <Button
                      className="h-7 gap-1.5 px-2.5 capitalize"
                      key={kind}
                      onClick={() => {
                        document
                          .getElementById(`library-kind-${kind}`)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      {kind}
                      <span className="tabular-nums text-muted-foreground">{items.length}</span>
                    </Button>
                  ))}
                </div>
              ) : null}
              {kindSections.map(([kind, items]) => (
                <section className="grid gap-3" id={`library-kind-${kind}`} key={kind}>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold capitalize text-foreground">{kind}</h3>
                    <Badge variant="default">{items.length}</Badge>
                  </div>
                  <div
                    className={cn(
                      'grid gap-3',
                      selected ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3'
                    )}
                  >
                    {items.map((asset) => (
                      <AssetCard
                        asset={asset}
                        compact={Boolean(selected)}
                        key={`${asset.kind}-${asset.name}`}
                        onSelect={() =>
                          setSelected({ kind: asset.kind as AssetKind, name: asset.name })
                        }
                        selected={
                          selected?.kind === asset.kind && selected?.name === asset.name
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <Card
            className={cn(
              'fixed inset-0 z-40 flex flex-col overflow-hidden rounded-none border-0 bg-card',
              'xl:static xl:z-auto xl:rounded-xl xl:border xl:border-border xl:bg-card'
            )}
          >
            <CardHeader>
              <div className="flex items-start gap-3">
                <Button
                  className="xl:hidden"
                  onClick={() => setSelected(null)}
                  size="icon-sm"
                  variant="ghost"
                >
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
                    <Badge variant="default">
                      {formatSkillSourceType(selectedAsset.data?.provenance)}
                    </Badge>
                    {isUpstreamSkill ? <Badge variant="default">Upstream-owned</Badge> : null}
                  </div>
                  <p className="mt-1 break-all font-mono leading-5 text-foreground/80">
                    {formatSkillSource(selectedAsset.data?.provenance)}
                  </p>
                  {selectedAsset.data?.provenance?.subdir ? (
                    <p className="mt-1">
                      Subdir · <span className="font-mono">{selectedAsset.data.provenance.subdir}</span>
                    </p>
                  ) : null}
                  {selectedAsset.data?.provenance?.updatedAt ? (
                    <p className="mt-1">
                      Locked · {new Date(selectedAsset.data.provenance.updatedAt).toLocaleString()}
                    </p>
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
                      isUpstreamSkill
                        ? `View ${selected.kind} ${selected.name}`
                        : `Edit ${selected.kind} ${selected.name}`
                    }
                    onChange={setEditorContent}
                    onSave={() => {
                      if (!isUpstreamSkill && !saveAsset.isPending) {
                        saveAsset.mutate();
                      }
                    }}
                    readOnly={isUpstreamSkill}
                    value={editorContent}
                  />
                </Suspense>
              </div>
              <div className="flex flex-wrap gap-3">
                {isUpstreamSkill ? (
                  <Button
                    className="w-fit"
                    disabled={forkSkill.isPending}
                    onClick={() => forkSkill.mutate(selected.name)}
                  >
                    <GitFork className="size-4" />
                    {forkSkill.isPending ? 'Forking…' : 'Fork to customize'}
                  </Button>
                ) : (
                  <Button className="w-fit" disabled={saveAsset.isPending} onClick={() => saveAsset.mutate()}>
                    {saveAsset.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                )}
                {isUpstreamSkill ? (
                  <Button
                    className="w-fit"
                    disabled={updateSkills.isPending}
                    onClick={() => updateSkills.mutate(selected.name)}
                    variant="secondary"
                  >
                    <RefreshCw className="size-4" />
                    {updateSkills.isPending ? 'Updating…' : 'Update from source'}
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
                  disabled={removeAsset.isPending}
                  onClick={() => setRemoveOpen(true)}
                  variant="secondary"
                >
                  <Trash2 className="size-4" />
                  {removeAsset.isPending ? 'Deleting…' : 'Delete asset'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog
        onOpenChange={(open) => {
          setCreateOpen(open);
          syncCreateParam(open);
        }}
        open={createOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create asset</DialogTitle>
            <DialogDescription>Add a new portable asset to the local hub without leaving the library workspace.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Name</span>
              <Input onChange={(event) => setDraftName(event.target.value)} value={draftName} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Kind</span>
              <Select value={draftKind} onChange={(event) => setDraftKind(event.target.value as AssetKind)}>
                <option value="skills">skills</option>
                <option value="agents">agents</option>
                <option value="workflows">workflows</option>
                <option value="rules">rules</option>
              </Select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Content</span>
              <Textarea onChange={(event) => setDraftContent(event.target.value)} rows={12} value={draftContent} />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button
              onClick={() => {
                setCreateOpen(false);
                syncCreateParam(false);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button disabled={createAsset.isPending || draftName.trim().length === 0} onClick={() => createAsset.mutate()}>
              {createAsset.isPending ? 'Creating…' : 'Create asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setInstallOpen} open={installOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Install skill</DialogTitle>
            <DialogDescription>
              Install into the hub from a local folder or git repo, then project to Claude, Cursor, and other editors.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Tabs
              onValueChange={(value) => {
                setInstallMode(value as 'path' | 'repo');
                setBrowsedFolder(null);
              }}
              value={installMode}
            >
              <TabsList>
                <TabsTrigger value="path">Local path</TabsTrigger>
                <TabsTrigger value="repo">Git repo</TabsTrigger>
              </TabsList>
            </Tabs>
            {installMode === 'path' ? (
              <div className="grid gap-2">
                <span className="text-sm text-muted-foreground">Skill directory</span>
                <div className="flex gap-2">
                  <Input
                    onChange={(event) => {
                      setBrowsedFolder(null);
                      setInstallPath(event.target.value);
                    }}
                    placeholder="/Users/you/www/skills/my-skill"
                    value={browsedFolder ? `${browsedFolder.label} (${browsedFolder.files.length} files)` : installPath}
                  />
                  <Button
                    className="shrink-0"
                    onClick={() => folderInputRef.current?.click()}
                    type="button"
                    variant="secondary"
                  >
                    <FolderOpen className="size-4" />
                    Browse
                  </Button>
                  <input
                    className="hidden"
                    multiple
                    onChange={(event) => {
                      const list = event.target.files;
                      if (!list || list.length === 0) {
                        return;
                      }
                      void readBrowsedSkillFolder(list)
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
                    }}
                    ref={(element) => {
                      folderInputRef.current = element;
                      if (element) {
                        element.setAttribute('webkitdirectory', '');
                        element.setAttribute('directory', '');
                      }
                    }}
                    type="file"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Browse selects a folder and uploads it to the hub. You can still paste an absolute server path instead.
                </p>
              </div>
            ) : (
              <>
                <label className="grid gap-2">
                  <span className="text-sm text-muted-foreground">Repository URL</span>
                  <Input
                    onChange={(event) => setInstallRepo(event.target.value)}
                    placeholder="https://github.com/org/skills.git"
                    value={installRepo}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm text-muted-foreground">Subdir (optional)</span>
                  <Input
                    onChange={(event) => setInstallSubdir(event.target.value)}
                    placeholder="skills/my-skill"
                    value={installSubdir}
                  />
                </label>
              </>
            )}
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Name override (optional)</span>
              <Input onChange={(event) => setInstallName(event.target.value)} value={installName} />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                checked={installForce}
                onChange={(event) => setInstallForce(event.target.checked)}
                type="checkbox"
              />
              Replace if the skill already exists in the hub
            </label>
          </DialogBody>
          <DialogFooter>
            <Button
              disabled={migrateAgentsSkills.isPending}
              onClick={() => migrateAgentsSkills.mutate()}
              variant="secondary"
            >
              {migrateAgentsSkills.isPending ? 'Migrating…' : 'Migrate from agents lock'}
            </Button>
            <Button onClick={() => setInstallOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={
                installSkill.isPending ||
                (installMode === 'path'
                  ? !browsedFolder && installPath.trim().length === 0
                  : installRepo.trim().length === 0)
              }
              onClick={() => installSkill.mutate()}
            >
              {installSkill.isPending ? 'Installing…' : 'Install'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setRemoveOpen} open={removeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete asset</DialogTitle>
            <DialogDescription>This removes the selected asset from the local hub and updates the SQLite index.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {selected ? `${selected.kind}/${selected.name} will be permanently deleted.` : 'No asset is selected.'}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setRemoveOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={!selected || removeAsset.isPending}
              onClick={() => removeAsset.mutate()}
              variant="destructive"
            >
              {removeAsset.isPending ? 'Deleting…' : 'Confirm delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setDiscoverOpen} open={discoverOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Discover</DialogTitle>
            <DialogDescription>
              Assets already native in a linked editor but not yet tracked by the hub. Importing copies them in and keeps them
              in sync everywhere from now on.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {discoverQuery.isLoading ? (
              <div aria-busy="true" aria-label="Scanning editors" className="grid gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : Object.entries(groupedDiscovered).length > 0 ? (
              <div className="grid gap-5">
                {Object.entries(groupedDiscovered).map(([editorLabel, candidates]) => (
                  <div className="grid gap-2" key={editorLabel}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-foreground">{editorLabel}</h3>
                      <Badge>{candidates.length}</Badge>
                    </div>
                    <ul className="overflow-hidden rounded-2xl border border-border">
                      {candidates.map((candidate) => (
                        <li
                          className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3 py-3 last:border-b-0"
                          key={`${candidate.editorId}-${candidate.kind}-${candidate.name}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-sm font-medium text-foreground">{candidate.name}</strong>
                              <Badge variant="accent">{candidate.kind}</Badge>
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{candidate.preview}</p>
                          </div>
                          <Button
                            className="w-fit shrink-0"
                            disabled={importAsset.isPending}
                            onClick={() => importAsset.mutate(candidate)}
                            size="sm"
                          >
                            Import
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                Nothing to import — every native asset in your linked editors is already tracked by the hub.
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setDiscoverOpen(false)} variant="secondary">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </section>
    </>
  );
}