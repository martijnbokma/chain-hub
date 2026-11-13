import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { learningsApi, libraryApi } from '@/lib/api';
import { makeAsset, renderWithProviders } from '@/test/render';
import type { CaptureEvent, LearningsTimeline, ReflectionReport } from '@/types';

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
        openNoteCount: 0,
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

function timeline(events: CaptureEvent[]): LearningsTimeline {
  return {
    totalEvents: events.length,
    returnedEvents: events.length,
    offset: 0,
    skippedLines: 0,
    logPath: '/hub/memory/learnings/events.jsonl',
    events,
    status: events.length === 0 ? 'empty' : 'active'
  };
}

beforeEach(() => {
  vi.spyOn(libraryApi, 'getAll').mockResolvedValue([makeAsset({ kind: 'skills', name: 'pr-review' })]);
  vi.spyOn(learningsApi, 'getTimeline').mockResolvedValue(timeline([]));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LearningsPage', () => {
  it('shows skill reflections and links skills needing attention to an audit', async () => {
    vi.spyOn(learningsApi, 'getReflection').mockResolvedValue(report());
    renderWithProviders(<LearningsPage />, { route: '/learnings' });

    expect(await screen.findByText('Needs attention')).toBeInTheDocument();
    for (const link of screen.getAllByRole('link', { name: 'Audit skill' })) {
      expect(link).toHaveAttribute('href', expect.stringContaining('asset=pr-review'));
    }
  });

  it('renders the trend badge as a tooltip trigger and offers an audit action for open issues', async () => {
    vi.spyOn(learningsApi, 'getReflection').mockResolvedValue(report());
    renderWithProviders(<LearningsPage />, { route: '/learnings' });

    expect(await screen.findByRole('button', { name: '★ new' })).toBeInTheDocument();
    expect(screen.getByText(/1 correction open/)).toBeInTheDocument();
  });

  it('lets a collecting skill audit or clear its open notes', async () => {
    vi.spyOn(learningsApi, 'getReflection').mockResolvedValue(
      report({
        totalEvents: 3,
        skills: [
          {
            skill: 'pr-review',
            totalEvents: 3,
            successCount: 0,
            failureCount: 0,
            correctionCount: 0,
            noteCount: 3,
            openFailureCount: 0,
            openCorrectionCount: 0,
            openNoteCount: 3,
            resolvedAt: null,
            firstSeen: correction.capturedAt,
            lastSeen: correction.capturedAt,
            trend: 'collecting',
            recentEvents: [correction]
          }
        ]
      })
    );
    renderWithProviders(<LearningsPage />, { route: '/learnings' });

    expect(await screen.findByText('• collecting')).toBeInTheDocument();
    expect(screen.getByText(/3 notes open/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Audit skill' })).toHaveAttribute(
      'href',
      expect.stringContaining('asset=pr-review')
    );
    expect(screen.getByRole('button', { name: 'Mark addressed' })).toBeInTheDocument();
  });

  it('offers a create-skill link seeded with open reports for a topic with no skill in the hub', async () => {
    const note: CaptureEvent = {
      id: 'evt-2',
      type: 'note',
      skill: 'calaca-ui',
      summary: 'Bundler imports must point at dist/*.js',
      capturedAt: '2026-11-12T00:00:00.000Z'
    };
    vi.spyOn(learningsApi, 'getReflection').mockResolvedValue(
      report({
        totalEvents: 1,
        skills: [
          {
            skill: 'calaca-ui',
            totalEvents: 1,
            successCount: 0,
            failureCount: 0,
            correctionCount: 0,
            noteCount: 1,
            openFailureCount: 0,
            openCorrectionCount: 0,
            openNoteCount: 1,
            resolvedAt: null,
            firstSeen: note.capturedAt,
            lastSeen: note.capturedAt,
            trend: 'new',
            recentEvents: [note]
          }
        ]
      })
    );
    vi.spyOn(learningsApi, 'getTimeline').mockResolvedValue(timeline([note]));
    renderWithProviders(<LearningsPage />, { route: '/learnings' });

    const link = await screen.findByRole('link', { name: 'Create skill' });
    expect(link).toHaveAttribute('href', expect.stringContaining('create=1'));
    expect(link).toHaveAttribute('href', expect.stringContaining('kind=skills'));
    expect(link).toHaveAttribute('href', expect.stringContaining('name=calaca-ui'));
    expect(link).toHaveAttribute('href', expect.stringContaining('intent='));
  });

  it('groups collections into open and quiet so long lists stay compact', async () => {
    const user = userEvent.setup();
    const done: CaptureEvent = {
      id: 'evt-3',
      type: 'note',
      skill: 'done-skill',
      summary: 'Already folded in',
      capturedAt: '2026-09-10T00:00:00.000Z'
    };
    vi.spyOn(learningsApi, 'getReflection').mockResolvedValue(
      report({
        totalEvents: 3,
        totalSkills: 3,
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
            openNoteCount: 0,
            resolvedAt: null,
            firstSeen: correction.capturedAt,
            lastSeen: correction.capturedAt,
            trend: 'struggling',
            recentEvents: [correction]
          },
          {
            skill: 'calaca-ui',
            totalEvents: 1,
            successCount: 0,
            failureCount: 0,
            correctionCount: 0,
            noteCount: 1,
            openFailureCount: 0,
            openCorrectionCount: 0,
            openNoteCount: 1,
            resolvedAt: null,
            firstSeen: '2026-11-12T00:00:00.000Z',
            lastSeen: '2026-11-12T00:00:00.000Z',
            trend: 'new',
            recentEvents: []
          },
          {
            skill: 'done-skill',
            totalEvents: 1,
            successCount: 0,
            failureCount: 0,
            correctionCount: 0,
            noteCount: 1,
            openFailureCount: 0,
            openCorrectionCount: 0,
            openNoteCount: 0,
            resolvedAt: done.capturedAt,
            firstSeen: done.capturedAt,
            lastSeen: done.capturedAt,
            trend: 'stable',
            recentEvents: [done]
          }
        ]
      })
    );
    renderWithProviders(<LearningsPage />, { route: '/learnings' });

    expect(await screen.findByText('Open reports · 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /done-skill/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('no skill')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /Quiet · 1/ }));
    expect(await screen.findByRole('button', { name: /done-skill/ })).toBeInTheDocument();
  });

  it('marks a skill as addressed so it leaves the needs-attention list', async () => {
    const user = userEvent.setup();
    vi.spyOn(learningsApi, 'getReflection').mockResolvedValue(report());
    const resolve = vi
      .spyOn(learningsApi, 'resolveSkill')
      .mockResolvedValue({ skill: 'pr-review', resolvedAt: correction.capturedAt, resolvedCount: 1 });
    renderWithProviders(<LearningsPage />, { route: '/learnings' });

    await user.click((await screen.findAllByRole('button', { name: 'Mark addressed' }))[0]);

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
