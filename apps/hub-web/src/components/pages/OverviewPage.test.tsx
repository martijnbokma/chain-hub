import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { issuesApi, libraryApi, overviewApi } from '@/lib/api';
import { makeOverview, renderWithProviders } from '@/test/render';
import type { HubIssue } from '@/types';

import { OverviewPage } from './OverviewPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

function makeIssue(overrides: Partial<HubIssue> & Pick<HubIssue, 'id'>): HubIssue {
  return {
    severity: 'error',
    kind: 'health',
    title: 'Issue title',
    actions: [],
    ...overrides
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OverviewPage', () => {
  it('shows hub health and where the hub lives', async () => {
    vi.spyOn(overviewApi, 'get').mockResolvedValue(makeOverview());
    vi.spyOn(issuesApi, 'get').mockResolvedValue({ issues: [] });
    renderWithProviders(<OverviewPage />);

    expect(await screen.findByText('Healthy')).toBeInTheDocument();
    expect(screen.getAllByText('/home/test/.chain-hub').length).toBeGreaterThan(0);
  });

  it('lists structural issues under Needs attention', async () => {
    vi.spyOn(overviewApi, 'get').mockResolvedValue(
      makeOverview({ health: { initialized: true, issues: ['Missing directory: rules'] } })
    );
    vi.spyOn(issuesApi, 'get').mockResolvedValue({
      issues: [
        makeIssue({ id: 'health:0', title: 'Missing directory: rules', actions: ['open-setup'] })
      ]
    });
    renderWithProviders(<OverviewPage />);

    expect(await screen.findByRole('heading', { name: 'Issues' })).toBeInTheDocument();
    expect(screen.getByText('Missing directory: rules')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open setup' })).toHaveAttribute('href', '/setup');
  });

  it('links sync issues to the backup settings', async () => {
    vi.spyOn(overviewApi, 'get').mockResolvedValue(makeOverview());
    vi.spyOn(issuesApi, 'get').mockResolvedValue({
      issues: [
        makeIssue({
          id: 'sync:conflicts',
          kind: 'sync',
          title: 'Cloud backup has merge conflicts',
          actions: ['open-integrations']
        })
      ]
    });
    renderWithProviders(<OverviewPage />);

    expect(await screen.findByText('Cloud backup has merge conflicts')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open backup settings' })).toHaveAttribute('href', '/integrations');
  });

  it('imports ~/.agents skills that are not in the hub yet', async () => {
    const user = userEvent.setup();
    vi.spyOn(overviewApi, 'get').mockResolvedValue(
      makeOverview({ agentsSkillsDrift: { lockPath: '/home/test/.agents/.skill-lock.json', missingNames: ['pdf'], missingCount: 1 } })
    );
    vi.spyOn(issuesApi, 'get').mockResolvedValue({
      issues: [
        makeIssue({
          id: 'agents-drift',
          severity: 'warning',
          kind: 'agents-drift',
          title: '1 skill in ~/.agents not in Hub yet',
          actions: ['import-agents']
        })
      ]
    });
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
    vi.spyOn(issuesApi, 'get').mockResolvedValue({ issues: [] });
    renderWithProviders(<OverviewPage />);

    expect(await screen.findByText('Unable to load overview')).toBeInTheDocument();
  });
});
