import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Trash2 } from 'lucide-react';
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
import type { AssetKind, FilterKind, AssetRecord, AssetDetail } from '@/types';

export function LibraryPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<{ kind: AssetKind; name: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(searchParams.get('create') === '1');
  const [removeOpen, setRemoveOpen] = useState(false);
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

  if (library.isLoading) {
    return <EmptyState description="The asset index is loading." title="Loading library" />;
  }

  if (library.isError) {
    return <EmptyState description="The library index is temporarily unavailable." title="Unable to load library" />;
  }

  return (
    <section className="flex flex-col gap-5 h-[calc(100vh-108px)]">
      <div>
        <Eyebrow>Library</Eyebrow>
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Assets stay visible and portable.
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
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
        <Button
          onClick={() => {
            setCreateOpen(true);
            syncCreateParam(true);
          }}
        >
          <Plus className="size-4" />
          Create asset
        </Button>
        <Badge variant="accent">{filteredAssets.length} visible</Badge>
      </div>

      <div className={cn(
        'flex-1 min-h-0 grid gap-4',
        selected ? 'xl:grid-cols-2' : 'grid-cols-1 max-w-4xl mx-auto w-full'
      )}>
        <Card className="flex flex-col overflow-hidden">
          <CardHeader>
            <div>
              <Eyebrow>Index</Eyebrow>
              <CardTitle>Asset index</CardTitle>
            </div>
            <Badge variant="accent">{filteredAssets.length}</Badge>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {Object.entries(grouped).length > 0 ? (
              <div className="grid gap-5">
                {Object.entries(grouped).map(([kind, items]) => (
                  <div className="grid gap-2" key={kind}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-base font-semibold">{kind}</h3>
                      <Badge>{items.length}</Badge>
                    </div>
                    <div className="grid gap-2">
                      {items.map((item) => (
                        <button
                          className={cn(
                            'flex w-full items-start justify-between gap-3 rounded-xl border border-transparent bg-transparent px-3 py-3 text-left transition-colors hover:border-border hover:bg-muted/50',
                            selected?.kind === item.kind && selected?.name === item.name && 'border-border bg-secondary/70'
                          )}
                          key={item.id}
                          onClick={() => setSelected({ kind: item.kind as AssetKind, name: item.name })}
                          type="button"
                        >
                          <div>
                            <strong className="text-sm">{item.name}</strong>
                            <p className="mt-1 text-xs text-muted-foreground">{item.relativePath}</p>
                          </div>
                          <code className="text-xs text-muted-foreground">
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </code>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No assets match the current search and filter.
              </div>
            )}
          </CardContent>
        </Card>

        {selected ? (
          <Card className="flex flex-col overflow-hidden">
            <CardHeader>
              <div>
                <Eyebrow>Editor</Eyebrow>
                <CardTitle>Asset editor</CardTitle>
              </div>
              <Badge variant="accent">{selected.kind}</Badge>
            </CardHeader>
            <CardContent className="grid flex-1 grid-rows-[auto_1fr_auto] gap-4 overflow-hidden">
              <p className="text-sm text-muted-foreground">
                Editing <strong>{selected.name}</strong>
              </p>
              <div className="min-h-0">
                <Textarea
                  className="h-full min-h-[200px] resize-none font-mono text-xs leading-6"
                  onChange={(event) => setEditorContent(event.target.value)}
                  value={editorContent}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button disabled={saveAsset.isPending} onClick={() => saveAsset.mutate()}>
                  {saveAsset.isPending ? 'Saving...' : 'Save changes'}
                </Button>
                <Button disabled={removeAsset.isPending} onClick={() => setRemoveOpen(true)} variant="secondary">
                  <Trash2 className="size-4" />
                  {removeAsset.isPending ? 'Deleting...' : 'Delete asset'}
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
              {createAsset.isPending ? 'Creating...' : 'Create asset'}
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
              {selected ? `Delete ${selected.kind} / ${selected.name}?` : 'No asset is selected.'}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setRemoveOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={!selected || removeAsset.isPending} onClick={() => removeAsset.mutate()}>
              {removeAsset.isPending ? 'Deleting...' : 'Confirm delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}