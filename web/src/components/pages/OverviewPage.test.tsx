import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { issuesApi, overviewApi } from '@/lib/api';
import { makeOverview, renderWithProviders } from '@/test/render';
import type { HubIssue } from '@/types';

import { OverviewPage } from './OverviewPage';

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

  it('flags Needs attention and links issues to the Health page', async () => {
    vi.spyOn(overviewApi, 'get').mockResolvedValue(
      makeOverview({ health: { initialized: true, issues: ['Missing directory: rules'] } })
    );
    vi.spyOn(issuesApi, 'get').mockResolvedValue({
      issues: [
        makeIssue({ id: 'health:0', title: 'Missing directory: rules', actions: ['open-setup'] }),
        makeIssue({
          id: 'sync:conflicts',
          kind: 'sync',
          title: 'Cloud backup has merge conflicts',
          actions: ['open-integrations']
        })
      ]
    });
    renderWithProviders(<OverviewPage />);

    expect(await screen.findByText('Needs attention')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /issues need attention/ });
    expect(link).toHaveAttribute('href', '/health');
    expect(link).toHaveTextContent('2 issues need attention');
  });

  it('explains when the overview cannot load', async () => {
    vi.spyOn(overviewApi, 'get').mockRejectedValue(new Error('offline'));
    vi.spyOn(issuesApi, 'get').mockResolvedValue({ issues: [] });
    renderWithProviders(<OverviewPage />);

    expect(await screen.findByText('Unable to load overview')).toBeInTheDocument();
  });
});
