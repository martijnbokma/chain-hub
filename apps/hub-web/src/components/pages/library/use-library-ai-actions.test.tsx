import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { aiSettingsApi } from '@/lib/api';
import type { AssetKind } from '@/types';

import { useLibraryAiActions } from './use-library-ai-actions';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

type Props = { selected: { kind: AssetKind; name: string } | null; editorContent: string };

function renderAiActions(initial: Props, setEditorContent = vi.fn()) {
  return renderHook(
    (props: Props) => useLibraryAiActions({ ...props, setEditorContent, setSelected: vi.fn() }),
    { initialProps: initial, wrapper }
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useLibraryAiActions', () => {
  const audit = { summary: 'Tighten it', findings: [{ severity: 'medium' as const, title: 'Vague', detail: 'Be concrete.' }] };

  it('keeps audit results for the selected asset and clears them on selection change', async () => {
    vi.spyOn(aiSettingsApi, 'auditAsset').mockResolvedValue(audit);
    const { result, rerender } = renderAiActions({ selected: { kind: 'rules', name: 'a' }, editorContent: '# A' });

    act(() => result.current.auditAsset.mutate());
    await waitFor(() => expect(result.current.assetAudit).toEqual(audit));
    expect(aiSettingsApi.auditAsset).toHaveBeenCalledWith({ kind: 'rules', name: 'a', content: '# A' });

    rerender({ selected: { kind: 'rules', name: 'b' }, editorContent: '# B' });
    expect(result.current.assetAudit).toBeNull();
  });

  it('turns an improvement into a pending edit that applies to the editor on approve', async () => {
    vi.spyOn(aiSettingsApi, 'auditAsset').mockResolvedValue(audit);
    vi.spyOn(aiSettingsApi, 'improveAsset').mockResolvedValue({ content: '# A improved' });
    const setEditorContent = vi.fn();
    const { result } = renderAiActions({ selected: { kind: 'rules', name: 'a' }, editorContent: '# A' }, setEditorContent);

    act(() => result.current.auditAsset.mutate());
    await waitFor(() => expect(result.current.assetAudit).not.toBeNull());
    act(() => result.current.improveAsset.mutate());
    await waitFor(() =>
      expect(result.current.pendingAiEdit).toEqual({ label: 'Apply improvements', before: '# A', after: '# A improved' })
    );

    act(() => result.current.approveAiEdit());
    expect(setEditorContent).toHaveBeenCalledWith('# A improved');
    expect(result.current.pendingAiEdit).toBeNull();
    expect(result.current.assetAudit).toBeNull();
  });

  it('applies seeded analysis results when the matching asset gets selected', async () => {
    const kindAssessment = {
      currentKind: 'agents' as const,
      recommendedKind: 'skills' as const,
      matchesCurrent: false,
      reason: 'Reads like a skill'
    };
    const { result, rerender } = renderAiActions({ selected: { kind: 'rules', name: 'a' }, editorContent: '# A' });

    act(() =>
      result.current.seedAiResults({ kind: 'agents', name: 'b', kindAssessment, assetAudit: audit })
    );
    // Seeding does not leak into the currently selected asset.
    expect(result.current.kindAssessment).toBeNull();

    rerender({ selected: { kind: 'agents', name: 'b' }, editorContent: '# B' });
    expect(result.current.kindAssessment).toEqual(kindAssessment);
    expect(result.current.assetAudit).toEqual(audit);

    // …and a later selection clears them as usual.
    rerender({ selected: { kind: 'agents', name: 'c' }, editorContent: '# C' });
    expect(result.current.kindAssessment).toBeNull();
    expect(result.current.assetAudit).toBeNull();
  });

  it('applies a seed immediately when it matches the current selection', () => {
    const kindAssessment = {
      currentKind: 'rules' as const,
      recommendedKind: 'prompts' as const,
      matchesCurrent: false,
      reason: 'Single-shot text'
    };
    const { result } = renderAiActions({ selected: { kind: 'rules', name: 'a' }, editorContent: '# A' });

    act(() =>
      result.current.seedAiResults({ kind: 'rules', name: 'a', kindAssessment, assetAudit: null })
    );

    expect(result.current.kindAssessment).toEqual(kindAssessment);
    expect(result.current.assetAudit).toBeNull();
  });

  it('refuses to improve before an audit ran', async () => {
    const improve = vi.spyOn(aiSettingsApi, 'improveAsset');
    const { result } = renderAiActions({ selected: { kind: 'rules', name: 'a' }, editorContent: '# A' });

    act(() => result.current.improveAsset.mutate());
    await waitFor(() => expect(result.current.improveAsset.isError).toBe(true));
    expect(improve).not.toHaveBeenCalled();
  });
});
