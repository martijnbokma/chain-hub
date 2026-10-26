import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { libraryApi } from '@/lib/api';

import { useLibraryInstallFlow } from './use-library-install-flow';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderFlow(onInstalled = vi.fn()) {
  return { result: renderHook(() => useLibraryInstallFlow({ onInstalled }), { wrapper }).result, onInstalled };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useLibraryInstallFlow', () => {
  it('disables submit until a path is entered in path mode', () => {
    const { result } = renderFlow();
    expect(result.current.installSubmitDisabled).toBe(true);
    act(() => result.current.setInstallPath(' ~/skills/x '));
    expect(result.current.installSubmitDisabled).toBe(false);
  });

  it('requires a repo url in repo mode', () => {
    const { result } = renderFlow();
    act(() => result.current.setInstallMode('repo'));
    act(() => result.current.setInstallPath('/tmp/ignored'));
    expect(result.current.installSubmitDisabled).toBe(true);
    act(() => result.current.setInstallRepo('https://github.com/a/b'));
    expect(result.current.installSubmitDisabled).toBe(false);
  });

  it('installs from a path, notifies, closes and resets the form', async () => {
    const installed = { asset: { kind: 'skills' as const, name: 'cool' } };
    const spy = vi.spyOn(libraryApi, 'installSkill').mockResolvedValue(installed as never);
    const { result, onInstalled } = renderFlow();

    act(() => result.current.setInstallOpen(true));
    act(() => result.current.setInstallPath('/tmp/cool'));
    act(() => result.current.installSkill.mutate());

    await waitFor(() => expect(onInstalled).toHaveBeenCalledWith({ kind: 'skills', name: 'cool' }));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/tmp/cool', force: false })
    );
    expect(result.current.installOpen).toBe(false);
    expect(result.current.installPath).toBe('');
  });

  it('installs from a repo with subdir/name overrides', async () => {
    const spy = vi
      .spyOn(libraryApi, 'installSkill')
      .mockResolvedValue({ asset: { kind: 'skills' as const, name: 'x' } } as never);
    const { result } = renderFlow();

    act(() => {
      result.current.setInstallMode('repo');
      result.current.setInstallRepo('git@example:r');
      result.current.setInstallSubdir('sub/dir');
      result.current.setInstallName('custom');
      result.current.setInstallForce(true);
      result.current.installSkill.mutate();
    });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith({ repo: 'git@example:r', subdir: 'sub/dir', name: 'custom', force: true });
  });

  it('uses the bundle install when a folder was browsed', async () => {
    const bundle = vi
      .spyOn(libraryApi, 'installSkillBundle')
      .mockResolvedValue({ asset: { kind: 'skills' as const, name: 'b' } } as never);
    const { result } = renderFlow();

    act(() =>
      result.current.setBrowsedFolder({ label: 'browse-me', files: { 'SKILL.md': '# x' } })
    );
    act(() => result.current.installSkill.mutate());

    await waitFor(() => expect(bundle).toHaveBeenCalled());
    expect(bundle).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'browse-me', files: { 'SKILL.md': '# x' } })
    );
  });
});
