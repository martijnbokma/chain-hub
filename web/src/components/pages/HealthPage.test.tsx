import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { healthApi, libraryApi, securityApi } from '@/lib/api';
import { makeHealth, makeSubsystem, renderWithProviders } from '@/test/render';
import type { HubIssue } from '@/types';

import { HealthPage } from './HealthPage';

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

describe('HealthPage', () => {
  it('renders a status card for every subsystem', async () => {
    vi.spyOn(healthApi, 'get').mockResolvedValue(makeHealth());
    renderWithProviders(<HealthPage />);

    expect(await screen.findByText('Hub structure')).toBeInTheDocument();
    for (const label of ['Skills & updates', 'Editors', 'Sync & backup', 'Security scans', 'AI provider']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('Cloud backup is not connected.')).toBeInTheDocument();
    expect(screen.getByText('No open issues; every subsystem is in good shape.')).toBeInTheDocument();
  });

  it('groups issues under their subsystem and wires the actions', async () => {
    const user = userEvent.setup();
    vi.spyOn(healthApi, 'get').mockResolvedValue(
      makeHealth({
        status: 'warning',
        issueCount: 2,
        subsystems: [
          makeSubsystem({ id: 'structure', label: 'Hub structure' }),
          makeSubsystem({
            id: 'skills',
            label: 'Skills & updates',
            status: 'warning',
            issues: [
              makeIssue({
                id: 'agents-drift',
                severity: 'warning',
                kind: 'agents-drift',
                title: '1 skill in ~/.agents not in Hub yet',
                actions: ['import-agents']
              }),
              makeIssue({
                id: 'skill-check:pdf',
                kind: 'skill-check',
                title: 'Update check failed for pdf',
                assetKind: 'skills',
                assetName: 'pdf',
                actions: ['retry-check']
              })
            ]
          })
        ]
      })
    );
    const migrate = vi
      .spyOn(libraryApi, 'migrateAgentsSkills')
      .mockResolvedValue({ lockPath: '/home/test/.agents/.skill-lock.json', results: [{ name: 'pdf', status: 'migrated' }] });
    renderWithProviders(<HealthPage />);

    // The card keeps the bare label; the issue-group heading carries the prefix.
    expect(await screen.findByRole('heading', { name: 'Open issues: Skills & updates' })).toBeInTheDocument();
    expect(screen.getByText('1 skill in ~/.agents not in Hub yet')).toBeInTheDocument();
    expect(screen.queryByText('No open issues; every subsystem is in good shape.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Import into Hub' }));
    expect(migrate).toHaveBeenCalledWith({});
  });

  it('retries a failed skill update check from the issue card', async () => {
    const user = userEvent.setup();
    vi.spyOn(healthApi, 'get').mockResolvedValue(
      makeHealth({
        status: 'error',
        issueCount: 1,
        subsystems: [
          makeSubsystem({
            id: 'skills',
            label: 'Skills & updates',
            status: 'error',
            issues: [
              makeIssue({
                id: 'skill-check:pdf',
                kind: 'skill-check',
                title: 'Update check failed for pdf',
                assetKind: 'skills',
                assetName: 'pdf',
                actions: ['retry-check']
              })
            ]
          })
        ]
      })
    );
    const check = vi
      .spyOn(libraryApi, 'checkSkillUpdates')
      .mockResolvedValue({ checkedAt: '2026-11-07T00:00:00.000Z', results: [{ name: 'pdf', status: 'up_to_date', source: 'git' }] });
    renderWithProviders(<HealthPage />);

    await user.click(await screen.findByRole('button', { name: 'Retry check' }));

    expect(check).toHaveBeenCalledWith({ name: 'pdf', force: true });
  });

  it('removes a stale scan record from the issue card', async () => {
    const user = userEvent.setup();
    vi.spyOn(healthApi, 'get').mockResolvedValue(
      makeHealth({
        status: 'warning',
        issueCount: 1,
        subsystems: [
          makeSubsystem({
            id: 'security',
            label: 'Security scans',
            status: 'warning',
            issues: [
              makeIssue({
                id: 'security:skills/ghost',
                severity: 'warning',
                kind: 'security',
                title: 'Scan record for removed asset skills/ghost',
                assetKind: 'skills',
                assetName: 'ghost',
                actions: ['remove-scan']
              })
            ]
          })
        ]
      })
    );
    const remove = vi.spyOn(securityApi, 'removeScan').mockResolvedValue({ ok: true });
    renderWithProviders(<HealthPage />);

    await user.click(await screen.findByRole('button', { name: 'Remove record' }));

    expect(remove).toHaveBeenCalledWith('skills', 'ghost');
  });

  it('explains when the health report cannot load', async () => {
    vi.spyOn(healthApi, 'get').mockRejectedValue(new Error('offline'));
    renderWithProviders(<HealthPage />);

    expect(await screen.findByText('Unable to load health')).toBeInTheDocument();
  });
});
