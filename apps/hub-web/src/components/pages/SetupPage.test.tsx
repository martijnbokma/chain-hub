import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { integrationsApi, setupApi, validateApi } from '@/lib/api';
import { makeIntegration, makeSetupGuide, renderWithProviders } from '@/test/render';

import { SetupPage } from './SetupPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

afterEach(() => {
  vi.restoreAllMocks();
});

function mockGuide() {
  vi.spyOn(setupApi, 'getGuide').mockResolvedValue(makeSetupGuide());
  vi.spyOn(validateApi, 'run').mockResolvedValue({ ok: true, issues: [], checks: [] });
}

describe('SetupPage', () => {
  it('shows every step with its status', async () => {
    mockGuide();
    renderWithProviders(<SetupPage />);

    expect(await screen.findByRole('heading', { name: 'Connect editors' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Validate structure' })).toBeInTheDocument();
  });

  it('reports only installed editors after connecting', async () => {
    const user = userEvent.setup();
    mockGuide();
    vi.spyOn(integrationsApi, 'setup').mockResolvedValue([
      makeIntegration({ id: 'claude-code', label: 'Claude Code' }),
      makeIntegration({ id: 'zed', label: 'Zed', installed: false, connected: false, mode: 'missing' })
    ]);
    renderWithProviders(<SetupPage />);

    await user.click(await screen.findByRole('button', { name: 'Connect editors' }));

    expect(toast.success).toHaveBeenCalledWith('Connected 1 editor');
    expect(await screen.findByText('Claude Code')).toBeInTheDocument();
    expect(screen.queryByText('Zed')).not.toBeInTheDocument();
  });

  it('says so when no supported editor is installed', async () => {
    const user = userEvent.setup();
    mockGuide();
    vi.spyOn(integrationsApi, 'setup').mockResolvedValue([
      makeIntegration({ id: 'zed', label: 'Zed', installed: false, connected: false, mode: 'missing' })
    ]);
    renderWithProviders(<SetupPage />);

    await user.click(await screen.findByRole('button', { name: 'Connect editors' }));

    expect(toast.warning).toHaveBeenCalledWith('No supported editor found on this machine');
  });
});
