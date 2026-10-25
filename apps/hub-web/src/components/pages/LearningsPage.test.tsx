import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { learningsApi, libraryApi } from '@/lib/api';
import { makeAsset, renderWithProviders } from '@/test/render';
import type { CaptureEvent, ReflectionReport } from '@/types';

import { LearningsPage } from './LearningsPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const correction: CaptureEvent = {
  id: 'evt-1',
  type: 'correction',
  skill: 'pr-review',
  summary: 'Skill should check test coverage',
  capturedAt: '2026-09-20T10:00:00.000Z'
};

function report(overrides: Partial<ReflectionReport> = {}): ReflectionReport {
  return {
    generatedAt: '2026-09-24T10:00:00.000Z',
    totalEvents: 1,
    totalSkills: 1,
    logPath: '/hub/memory/learnings/events.jsonl',
    skills: [
      {
        skill: 'pr-review',
        totalEvents: 1,
        successCount: 0,
        failureCount: 0,
        correctionCount: 1,
        noteCount: 0,
        openFailureCount: 0,
        openCorrectionCount: 1,
        resolvedAt: null,
        firstSeen: correction.capturedAt,
        lastSeen: correction.capturedAt,
        trend: 'new',
        recentEvents: [correction]
      }
    ],
    ...overrides
  };
}

beforeEach(() => {
  vi.spyOn(libraryApi, 'getAll').mockResolvedValue([makeAsset({ kind: 'skills', name: 'pr-review' })]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LearningsPage', () => {
  it('shows skill reflections and links skills needing attention to an audit', async () => {
    vi.spyOn(learningsApi, 'getReflection').mockResolvedValue(report());
    renderWithProviders(<LearningsPage />, { route: '/learnings' });

    expect(await screen.findByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Audit skill' })).toHaveAttribute(
      'href',
      expect.stringContaining('asset=pr-review')
    );
  });

  it('marks a skill as addressed so it leaves the needs-attention list', async () => {
    const user = userEvent.setup();
    vi.spyOn(learningsApi, 'getReflection').mockResolvedValue(report());
    const resolve = vi
      .spyOn(learningsApi, 'resolveSkill')
      .mockResolvedValue({ skill: 'pr-review', resolvedAt: correction.capturedAt, resolvedCount: 1 });
    renderWithProviders(<LearningsPage />, { route: '/learnings' });

    await user.click(await screen.findByRole('button', { name: 'Mark addressed' }));

    await waitFor(() => expect(resolve).toHaveBeenCalledWith({ skill: 'pr-review' }));
    expect(toast.success).toHaveBeenCalledWith('Marked as addressed');
  });

  it('shows the empty state when nothing was captured', async () => {
    vi.spyOn(learningsApi, 'getReflection').mockResolvedValue(report({ totalEvents: 0, totalSkills: 0, skills: [] }));
    renderWithProviders(<LearningsPage />, { route: '/learnings' });

    expect(await screen.findByText('No learnings yet')).toBeInTheDocument();
  });

  it('logs a manual event with trimmed fields', async () => {
    const user = userEvent.setup();
    vi.spyOn(learningsApi, 'getReflection').mockResolvedValue(report({ totalEvents: 0, totalSkills: 0, skills: [] }));
    const capture = vi.spyOn(learningsApi, 'capture').mockResolvedValue(correction);
    renderWithProviders(<LearningsPage />, { route: '/learnings' });

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Event type' }), 'correction');
    await user.type(screen.getByRole('textbox', { name: 'Skill slug' }), '  pr-review ');
    await user.type(screen.getByRole('textbox', { name: 'Event summary' }), 'Skill should check test coverage');
    await user.click(screen.getByRole('button', { name: 'Log event' }));

    await waitFor(() =>
      expect(capture).toHaveBeenCalledWith({ type: 'correction', skill: 'pr-review', summary: 'Skill should check test coverage' })
    );
    expect(toast.success).toHaveBeenCalledWith('Event logged');
  });
});
