import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage, libraryApi } from '@/lib/api';
import type { AssetKind, SkillBatchItemResult } from '@/types';

interface SelectedRef {
  kind: AssetKind;
  name: string;
}

interface SkillMutationsDeps {
  selected: SelectedRef | null;
  setSelected: (selected: SelectedRef | null) => void;
  setForkOpen: (open: boolean) => void;
  setUpdateResults: (results: SkillBatchItemResult[] | null) => void;
}

/** Skill-lifecycle mutations: upstream update, update-check retry, unlink, fork. */
export function useLibrarySkillMutations({
  selected,
  setSelected,
  setForkOpen,
  setUpdateResults
}: SkillMutationsDeps) {
  const queryClient = useQueryClient();

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

  return { updateSkills, retryCheck, unlinkSkill, forkSkill };
}
