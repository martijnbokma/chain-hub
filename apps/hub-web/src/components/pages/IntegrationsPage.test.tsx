import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { integrationsApi } from '@/lib/api';
import { makeIntegration, renderWithProviders } from '@/test/render';

import { IntegrationsPage } from './IntegrationsPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

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
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Not connected')).toBeInTheDocument();
    expect(screen.getByText('Not installed')).toBeInTheDocument();
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
