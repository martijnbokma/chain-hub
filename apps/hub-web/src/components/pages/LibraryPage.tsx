import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Trash2, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { Eyebrow } from '@/components/common/Eyebrow';
import { libraryApi } from '@/lib/api';
import type { AssetKind, FilterKind, AssetRecord, AssetDetail, DiscoveredAsset } from '@/types';

type IndexRow =
  | { type: 'header'; kind: string; count: number }
  | { type: 'item'; asset: AssetRecord };

export function LibraryPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<{ kind: AssetKind; name: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(searchParams.get('create') === '1');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<FilterKind>('__all__');
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

  const indexRows = useMemo<IndexRow[]>(() => {
    const rows: IndexRow[] = [];
    for (const [kind, items] of Object.entries(grouped)) {
      rows.push({ type: 'header', kind, count: items.length });
      for (const asset of items) {
        rows.push({ type: 'item', asset });
      }
    }
    return rows;
  }, [grouped]);

  const kindHeaderIndex = useMemo(() => {
    const map: Record<string, number> = {};
    indexRows.forEach((row, index) => {
      if (row.type === 'header') {
        map[row.kind] = index;
      }
    });
    return map;
  }, [indexRows]);

  const indexScrollRef = useRef<HTMLDivElement | null>(null);
  const indexVirtualizer = useVirtualizer({
    count: indexRows.length,
    estimateSize: (index) => (indexRows[index]?.type === 'header' ? 44 : 72),
    getScrollElement: () => indexScrollRef.current,
    overscan: 10
  });

  if (library.isLoading) {
    return <EmptyState description="The asset index is loading." title="Loading library" />;
  }

  if (library.isError) {
    return <EmptyState description="The library index is temporarily unavailable." title="Unable to load library" />;
  }

  return (
    <section className="flex h-[calc(100vh-108px)] flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <Eyebrow>Library</Eyebrow>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Assets</h2>
            <Badge variant="default">{filteredAssets.length} visible</Badge>
          </div>
          <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
            Browse, edit, and import portable skills, agents, workflows, and rules.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="w-fit"
            onClick={() => {
              setCreateOpen(true);
              syncCreateParam(true);
            }}
          >
            <Plus className="size-4" />
            Create asset
          </Button>
          <Button className="w-fit" onClick={() => setDiscoverOpen(true)} variant="secondary">
            <Sparkles className="size-4" />
            Discover
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search assets"
            className="pl-9"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search assets"
            value={searchQuery}
          />
        </div>
        <Tabs onValueChange={(value) => setFilterKind(value as FilterKind)} value={filterKind}>
          <TabsList>
            <TabsTrigger value="__all__">All</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className={cn(
        'flex-1 min-h-0 grid gap-4',
        selected ? 'xl:grid-cols-2' : 'grid-cols-1 max-w-4xl mx-auto w-full'
      )}>
        <Card className={cn('flex flex-col overflow-hidden', selected && 'hidden xl:flex')}>
          <CardHeader>
            <CardTitle>Index</CardTitle>
            <Badge variant="default">{filteredAssets.length}</Badge>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 min-h-0">
            {Object.keys(grouped).length > 1 && (
              <div className="flex shrink-0 flex-wrap gap-2 border-b border-border pb-3">
                {Object.entries(grouped).map(([kind, items]) => (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-transparent px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    key={kind}
                    onClick={() => {
                      const index = kindHeaderIndex[kind];
                      if (index !== undefined) {
                        indexVirtualizer.scrollToIndex(index, { align: 'start' });
                      }
                    }}
                    type="button"
                  >
                    {kind}
                    <span className="text-xs text-muted-foreground/70">{items.length}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto" ref={indexScrollRef}>
              {indexRows.length > 0 ? (
                <div style={{ height: indexVirtualizer.getTotalSize(), position: 'relative' }}>
                  {indexVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = indexRows[virtualRow.index];

                    return (
                      <div
                        data-index={virtualRow.index}
                        key={virtualRow.key}
                        ref={indexVirtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`
                        }}
                      >
                        {row.type === 'header' ? (
                          <div className="flex items-center justify-between gap-3 pb-2 pt-3">
                            <h3 className="text-sm font-semibold capitalize text-foreground">{row.kind}</h3>
                            <Badge>{row.count}</Badge>
                          </div>
                        ) : (
                          <button
                            className={cn(
                              'mb-1 flex w-full items-start justify-between gap-3 rounded-lg border border-transparent bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-muted',
                              selected?.kind === row.asset.kind &&
                                selected?.name === row.asset.name &&
                                'bg-muted'
                            )}
                            onClick={() => setSelected({ kind: row.asset.kind as AssetKind, name: row.asset.name })}
                            type="button"
                          >
                            <div className="min-w-0">
                              <strong className="text-sm font-medium">{row.asset.name}</strong>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {row.asset.relativePath}
                              </p>
                            </div>
                            <code className="shrink-0 text-xs text-muted-foreground">
                              {new Date(row.asset.updatedAt).toLocaleDateString()}
                            </code>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  No assets match the current search and filter.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                  className="size-11 xl:hidden"
                  onClick={() => setSelected(null)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <ArrowLeft className="size-4" />
                  <span className="sr-only">Back to index</span>
                </Button>
                <div className="grid min-w-0 gap-1">
                  <CardTitle className="truncate">{selected.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">Editing {selected.kind}</p>
                </div>
              </div>
              <Badge variant="accent">{selected.kind}</Badge>
            </CardHeader>
            <CardContent className="grid flex-1 grid-rows-[1fr_auto] gap-4 overflow-hidden">
              <div className="min-h-0">
                <Textarea
                  className="h-full resize-none font-mono text-xs leading-6 xl:min-h-[200px]"
                  onChange={(event) => setEditorContent(event.target.value)}
                  value={editorContent}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button disabled={saveAsset.isPending} onClick={() => saveAsset.mutate()}>
                  {saveAsset.isPending ? 'Saving…' : 'Save changes'}
                </Button>
                <Button disabled={removeAsset.isPending} onClick={() => setRemoveOpen(true)} variant="secondary">
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

      <Dialog onOpenChange={setRemoveOpen} open={removeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete asset</DialogTitle>
            <DialogDescription>This removes the selected asset from the local hub and updates the SQLite index.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
              {selected ? `${selected.kind}/${selected.name} will be permanently deleted.` : 'No asset is selected.'}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setRemoveOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={!selected || removeAsset.isPending} onClick={() => removeAsset.mutate()}>
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
              <p className="text-sm text-muted-foreground">Scanning linked editors...</p>
            ) : Object.entries(groupedDiscovered).length > 0 ? (
              <div className="grid gap-5">
                {Object.entries(groupedDiscovered).map(([editorLabel, candidates]) => (
                  <div className="grid gap-2" key={editorLabel}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-base font-semibold">{editorLabel}</h3>
                      <Badge>{candidates.length}</Badge>
                    </div>
                    <div className="grid gap-2">
                      {candidates.map((candidate) => (
                        <div
                          className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-3"
                          key={`${candidate.editorId}-${candidate.kind}-${candidate.name}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-sm">{candidate.name}</strong>
                              <Badge variant="accent">{candidate.kind}</Badge>
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{candidate.preview}</p>
                          </div>
                          <Button
                            className="shrink-0"
                            disabled={importAsset.isPending}
                            onClick={() => importAsset.mutate(candidate)}
                            size="sm"
                          >
                            Import
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
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
  );
}