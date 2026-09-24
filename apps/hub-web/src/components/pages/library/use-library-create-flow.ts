import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ensureExplicitDescription, listAssetCompatIssues } from '@chain-hub/contracts';
import { aiSettingsApi, libraryApi } from '@/lib/api';
import type { AssetKind } from '@/types';

import type { DraftKindChoice } from './CreateAssetDialog';

type SelectedAsset = { kind: AssetKind; name: string };

export function useLibraryCreateFlow(options: {
  searchParams: URLSearchParams;
  setSearchParams: (next: URLSearchParams, opts?: { replace?: boolean }) => void;
  onCreated: (selected: SelectedAsset) => void;
}) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(options.searchParams.get('create') === '1');
  const [draftName, setDraftName] = useState('');
  const [draftNameLocked, setDraftNameLocked] = useState(false);
  const [draftKindChoice, setDraftKindChoice] = useState<DraftKindChoice>('auto');
  const [draftKind, setDraftKind] = useState<AssetKind>('skills');
  const [kindReason, setKindReason] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('# New Asset\n');
  const [draftIntent, setDraftIntent] = useState('');

  const handleDraftKindChoiceChange = (value: DraftKindChoice) => {
    setDraftKindChoice(value);
    setKindReason(null);
    if (value !== 'auto') {
      setDraftKind(value);
    }
  };

  const resetCreateDraft = () => {
    setDraftName('');
    setDraftNameLocked(false);
    setDraftContent('# New Asset\n');
    setDraftIntent('');
    setDraftKindChoice('auto');
    setDraftKind('skills');
    setKindReason(null);
  };

  const syncCreateParam = (open: boolean) => {
    const next = new URLSearchParams(options.searchParams);
    if (open) {
      next.set('create', '1');
    } else {
      next.delete('create');
    }
    options.setSearchParams(next, { replace: true });
  };

  const setCreateOpenSynced = (open: boolean) => {
    setCreateOpen(open);
    syncCreateParam(open);
  };

  const createAsset = useMutation({
    mutationFn: async () => {
      const content =
        draftKind === 'skills'
          ? ensureExplicitDescription(draftContent, draftName.trim() || 'new-skill')
          : draftContent;
      const blocking = listAssetCompatIssues(draftKind, content).find((issue) => issue.severity === 'error');
      if (blocking) {
        throw new Error(blocking.message);
      }

      try {
        return await libraryApi.create({
          kind: draftKind,
          name: draftName,
          content
        });
      } catch (error) {
        // fetch rejects with a TypeError when nothing answers; server errors carry their own message.
        if (error instanceof TypeError) {
          throw new Error('Hub server is unreachable. Run `bun run dev` or `chain hub` and try again.');
        }
        throw error;
      }
    },
    onSuccess: (asset) => {
      resetCreateDraft();
      options.onCreated({ kind: asset.kind as AssetKind, name: asset.name });
      setCreateOpenSynced(false);
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
      return aiSettingsApi.draftPrompt({
        intent: draftIntent.trim(),
        kind: draftKindChoice,
        name: draftNameLocked && draftName.trim() ? draftName.trim() : undefined
      });
    },
    onSuccess: (result) => {
      setDraftContent(result.content);
      setDraftKind(result.recommendedKind);
      if (draftKindChoice === 'auto') {
        setKindReason(result.reason ?? `Best fit as ${result.recommendedKind}`);
      } else {
        setKindReason(null);
      }
      if (!draftNameLocked && result.suggestedName) {
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

  return {
    createOpen,
    setCreateOpenFromParams: setCreateOpen,
    setCreateOpenSynced,
    draftName,
    setDraftName,
    draftNameLocked,
    setDraftNameLocked,
    draftKindChoice,
    handleDraftKindChoiceChange,
    draftKind,
    kindReason,
    draftContent,
    setDraftContent,
    draftIntent,
    setDraftIntent,
    createAsset,
    draftPromptWithAi
  };
}
