import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage, libraryApi } from '@/lib/api';
import type { AssetKind, DiscoveredAsset, SkillBatchItemResult } from '@/types';

interface SelectedRef {
  kind: AssetKind;
  name: string;
}

interface LibraryAssetMutationsDeps {
  selected: SelectedRef | null;
  editorContent: string;
  /** Content of the currently loaded asset — used to skip a redundant save before convert. */
  loadedContent: string | undefined;
  discoverOpen: boolean;
  setSelected: (selected: SelectedRef | null) => void;
  setEditorContent: (value: string) => void;
  setRemoveOpen: (open: boolean) => void;
  setForkOpen: (open: boolean) => void;
  setUpdateResults: (results: SkillBatchItemResult[] | null) => void;
  setImportProgress: (progress: { current: number; total: number } | null) => void;
  resetAiResults: () => void;
}

/** All library mutations (save/rename/remove/update/retry/unlink/fork/convert + discover/import). */
export function useLibraryAssetMutations({
  selected,
  editorContent,
  loadedContent,
  discoverOpen,
  setSelected,
  setEditorContent,
  setRemoveOpen,
  setForkOpen,
  setUpdateResults,
  setImportProgress,
  resetAiResults
}: LibraryAssetMutationsDeps) {
  const queryClient = useQueryClient();

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
      if (editorContent !== loadedContent) {
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

  return {
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
    convertKind
  };
}
