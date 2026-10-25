import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { integrationsApi, syncApi } from '@/lib/api';
import { makeIntegration, renderWithProviders } from '@/test/render';
import type { SyncStatus } from '@/types';

import { IntegrationsPage } from './IntegrationsPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const disconnectedSync: SyncStatus = {
  connected: false,
  enabled: false,
  autoSync: true,
  remote: null,
  authMethod: null,
  machineId: 'test-machine',
  lastSyncAt: null,
  lastSyncError: null,
  uncommitted: 0,
  ahead: 0,
  behind: 0,
  conflicts: []
};

beforeEach(() => {
  vi.spyOn(syncApi, 'status').mockResolvedValue(disconnectedSync);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IntegrationsPage', () => {
  it('counts installed editors only and marks the rest as not installed', async () => {
    vi.spyOn(integrationsApi, 'getAll').mockResolvedValue([
      makeIntegration({ id: 'claude-code', label: 'Claude Code' }),
      makeIntegration({ id: 'cursor', label: 'Cursor', connected: false, mode: 'missing' }),
      makeIntegration({ id: 'zed', label: 'Zed', installed: false, connected: false, mode: 'missing' })
    ]);
    renderWithProviders(<IntegrationsPage />);

    expect(await screen.findByText('1/2')).toBeInTheDocument();
    const editors = within(screen.getByRole('list'));
    expect(editors.getByText('Connected')).toBeInTheDocument();
    expect(editors.getByText('Not connected')).toBeInTheDocument();
    expect(editors.getByText('Not installed')).toBeInTheDocument();
  });

  it('connects editors on request', async () => {
    const user = userEvent.setup();
    vi.spyOn(integrationsApi, 'getAll').mockResolvedValue([makeIntegration({ id: 'cursor', label: 'Cursor' })]);
    const setup = vi.spyOn(integrationsApi, 'setup').mockResolvedValue([makeIntegration({ id: 'cursor', label: 'Cursor' })]);
    renderWithProviders(<IntegrationsPage />);

    await user.click(await screen.findByRole('button', { name: 'Connect editors' }));

    expect(setup).toHaveBeenCalled();
  });
});
