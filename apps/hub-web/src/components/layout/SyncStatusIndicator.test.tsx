import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { syncApi } from '@/lib/api';
import { renderWithProviders } from '@/test/render';
import type { SyncStatus } from '@/types';

import { SyncStatusIndicator } from './SyncStatusIndicator';

function makeSyncStatus(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return {
    connected: true,
    enabled: true,
    autoSync: true,
    remote: { provider: 'github', url: 'https://github.com/tester/chain-hub-sync.git', repo: 'tester/chain-hub-sync' },
    authMethod: 'gh',
    machineId: 'test-machine',
    lastSyncAt: '2026-10-25T14:28:32.000Z',
    lastSyncError: null,
    uncommitted: 0,
    ahead: 0,
    behind: 0,
    conflicts: [],
    ...overrides
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SyncStatusIndicator', () => {
  it('renders nothing while disconnected — backup is opt-in', async () => {
    vi.spyOn(syncApi, 'status').mockResolvedValue(makeSyncStatus({ connected: false }));
    renderWithProviders(<SyncStatusIndicator />);

    await vi.waitFor(() => expect(syncApi.status).toHaveBeenCalled());
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('stays quiet when everything is backed up', async () => {
    vi.spyOn(syncApi, 'status').mockResolvedValue(makeSyncStatus());
    renderWithProviders(<SyncStatusIndicator />);

    const link = await screen.findByRole('link', { name: 'Cloud backup: Backed up' });
    expect(link).toHaveAttribute('href', '/integrations');
  });

  it('warns about unsynced changes', async () => {
    vi.spyOn(syncApi, 'status').mockResolvedValue(makeSyncStatus({ uncommitted: 3 }));
    renderWithProviders(<SyncStatusIndicator />);

    expect(await screen.findByText('3 unsynced changes')).toBeInTheDocument();
  });

  it('escalates to a call to action for merge conflicts', async () => {
    vi.spyOn(syncApi, 'status').mockResolvedValue(
      makeSyncStatus({ conflicts: [{ path: 'rules/shared.md' }, { path: 'skills/demo/SKILL.md' }] })
    );
    renderWithProviders(<SyncStatusIndicator />);

    expect(await screen.findByText('Resolve 2 sync conflicts')).toBeInTheDocument();
  });

  it('surfaces a failed auto-sync', async () => {
    vi.spyOn(syncApi, 'status').mockResolvedValue(
      makeSyncStatus({ lastSyncError: 'Auto-sync failed: network unreachable' })
    );
    renderWithProviders(<SyncStatusIndicator />);

    expect(await screen.findByText('Backup sync failed')).toBeInTheDocument();
  });
});
