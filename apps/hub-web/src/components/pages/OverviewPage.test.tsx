import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { libraryApi, overviewApi } from '@/lib/api';
import { makeOverview, renderWithProviders } from '@/test/render';

import { OverviewPage } from './OverviewPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OverviewPage', () => {
  it('shows hub health and where the hub lives', async () => {
    vi.spyOn(overviewApi, 'get').mockResolvedValue(makeOverview());
    renderWithProviders(<OverviewPage />);

    expect(await screen.findByText('Healthy')).toBeInTheDocument();
    expect(screen.getAllByText('/home/test/.chain-hub').length).toBeGreaterThan(0);
  });

  it('lists structural issues', async () => {
    vi.spyOn(overviewApi, 'get').mockResolvedValue(
      makeOverview({ health: { initialized: true, issues: ['Missing directory: rules'] } })
    );
    renderWithProviders(<OverviewPage />);

    expect(await screen.findByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText('Missing directory: rules')).toBeInTheDocument();
  });

  it('imports ~/.agents skills that are not in the hub yet', async () => {
    const user = userEvent.setup();
    vi.spyOn(overviewApi, 'get').mockResolvedValue(
      makeOverview({ agentsSkillsDrift: { lockPath: '/home/test/.agents/.skill-lock.json', missingNames: ['pdf'], missingCount: 1 } })
    );
    const migrate = vi
      .spyOn(libraryApi, 'migrateAgentsSkills')
      .mockResolvedValue({ lockPath: '/home/test/.agents/.skill-lock.json', results: [{ name: 'pdf', status: 'migrated' }] });
    renderWithProviders(<OverviewPage />);

    await user.click(await screen.findByRole('button', { name: 'Import into Hub' }));

    expect(migrate).toHaveBeenCalledWith({});
    expect(toast.success).toHaveBeenCalledWith('Imported from ~/.agents: 1 migrated, 0 skipped, 0 failed');
  });

  it('explains when the overview cannot load', async () => {
    vi.spyOn(overviewApi, 'get').mockRejectedValue(new Error('offline'));
    renderWithProviders(<OverviewPage />);

    expect(await screen.findByText('Unable to load overview')).toBeInTheDocument();
  });
});
