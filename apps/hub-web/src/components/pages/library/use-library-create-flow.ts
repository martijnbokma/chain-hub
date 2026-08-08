import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { aiSettingsApi, libraryApi } from '@/lib/api';
import type { AssetDetail, AssetKind, DraftPromptResult } from '@/types';

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
      const response = await aiSettingsApi.draftPrompt({
        intent: draftIntent.trim(),
        kind: draftKindChoice,
        name: draftNameLocked && draftName.trim() ? draftName.trim() : undefined
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
