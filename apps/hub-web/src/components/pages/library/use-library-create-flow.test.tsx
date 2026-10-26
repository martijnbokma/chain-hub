import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { aiSettingsApi, libraryApi } from '@/lib/api';

import { useLibraryCreateFlow } from './use-library-create-flow';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderFlow(searchParams = new URLSearchParams(), onCreated = vi.fn(), setSearchParams = vi.fn()) {
  return {
    result: renderHook(
      () => useLibraryCreateFlow({ searchParams, setSearchParams, onCreated }),
      { wrapper }
    ).result,
    onCreated,
    setSearchParams
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useLibraryCreateFlow', () => {
  it('opens when the create=1 param is present and syncs the param back', () => {
    const params = new URLSearchParams('create=1&kind=skills');
    const { result, setSearchParams } = renderFlow(params);
    expect(result.current.createOpen).toBe(true);

    act(() => result.current.setCreateOpenSynced(false));
    const [next, opts] = setSearchParams.mock.calls[0];
    expect(next.get('create')).toBeNull();
    expect(next.get('kind')).toBe('skills');
    expect(opts).toEqual({ replace: true });
  });

  it('switches kind and clears the reason when choosing a concrete kind', () => {
    const { result } = renderFlow();
    act(() => result.current.setDraftIntent('x'));
    act(() => result.current.handleDraftKindChoiceChange('rules'));
    expect(result.current.draftKind).toBe('rules');
    expect(result.current.kindReason).toBeNull();
  });

  it('creates an asset and notifies onCreated', async () => {
    const create = vi
      .spyOn(libraryApi, 'create')
      .mockResolvedValue({ kind: 'rules', name: 'n1' } as never);
    const { result, onCreated } = renderFlow();

    act(() => {
      result.current.handleDraftKindChoiceChange('rules');
      result.current.setDraftName('n1');
      result.current.createAsset.mutate();
    });

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ kind: 'rules', name: 'n1' }));
    expect(create).toHaveBeenCalled();
    expect(result.current.createOpen).toBe(false);
    expect(result.current.draftName).toBe('');
  });

  it('fills the draft from the AI result and keeps a locked name', async () => {
    vi.spyOn(aiSettingsApi, 'draftPrompt').mockResolvedValue({
      content: '# drafted',
      recommendedKind: 'prompts',
      reason: 'one-shot',
      suggestedName: 'suggested-slug'
    } as never);
    const { result } = renderFlow();

    act(() => {
      result.current.setDraftName('locked-name');
      result.current.setDraftNameLocked(true);
      result.current.draftPromptWithAi.mutate();
    });

    await waitFor(() => expect(result.current.draftContent).toBe('# drafted'));
    expect(result.current.draftKind).toBe('prompts');
    expect(result.current.draftName).toBe('locked-name');
  });

  it('maps a fetch TypeError to a friendly unreachable-hub error', async () => {
    vi.spyOn(libraryApi, 'create').mockRejectedValue(new TypeError('fetch failed'));
    const { toast } = await import('sonner');
    const { result } = renderFlow();

    act(() => {
      result.current.setDraftName('x');
      result.current.createAsset.mutate();
    });

    await waitFor(() => expect(result.current.createAsset.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith(
      'Hub server is unreachable. Run `bun run dev` or `chain hub` and try again.'
    );
  });
});
