import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { analysisApi, libraryApi } from '@/lib/api';
import type { AnalysisItem, AssetRecord } from '@/types';

import { assetKey, useAnalysisReview } from './use-analysis-review';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const item = (over: Partial<AnalysisItem> = {}): AnalysisItem =>
  ({ id: 'i1', kind: 'skills', name: 'a', type: 'kind-mismatch', recommendedKind: 'rules', status: 'open', ...over }) as AnalysisItem;

function renderReview(assets: AssetRecord[] = []) {
  const assetsByKey = new Map(assets.map((a) => [assetKey(a.kind, a.name), a]));
  return renderHook(() => useAnalysisReview({ assetsByKey }), { wrapper }).result;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAnalysisReview', () => {
  it('toggles selection and selectAllOpen only picks open items', () => {
    const result = renderReview();
    act(() => result.current.toggleSelect('i1'));
    expect(result.current.selectedIds.has('i1')).toBe(true);
    act(() => result.current.toggleSelect('i1'));
    expect(result.current.selectedIds.size).toBe(0);

    act(() =>
      result.current.selectAllOpen([item({ id: 'open1' }), item({ id: 'done1', status: 'done' })])
    );
    expect([...result.current.selectedIds]).toEqual(['open1']);
  });

  it('skips items that are not editable in the hub', async () => {
    const convert = vi.spyOn(libraryApi, 'convert').mockResolvedValue({} as never);
    const result = renderReview([]);

    await act(async () => {
      await result.current.fixItem(item());
    });

    expect(convert).not.toHaveBeenCalled();
    expect(result.current.fixingId).toBeNull();
  });

  it('converts an editable kind-mismatch and marks it done', async () => {
    const record = { kind: 'skills', name: 'a' } as AssetRecord;
    const convert = vi.spyOn(libraryApi, 'convert').mockResolvedValue({} as never);
    const setStatus = vi.spyOn(analysisApi, 'setItemStatus').mockResolvedValue({} as never);
    const result = renderReview([record]);

    await act(async () => {
      await result.current.fixItem(item());
    });

    expect(convert).toHaveBeenCalledWith('skills', 'a', { toKind: 'rules' });
    expect(setStatus).toHaveBeenCalledWith({ id: 'i1', status: 'done' });
  });
});
