import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { learningsApi } from '@/lib/api';
import { renderWithProviders } from '@/test/render';
import type { FoldArtifactSummary } from '@/types';

import { FoldHistoryCard } from './FoldHistoryCard';

function fold(index: number): FoldArtifactSummary {
  const skill = `skill-${String(index).padStart(2, '0')}`;
  return { date: '2026-11-07', skill, outcome: 'applied', writtenTo: null, fileName: `${skill}.md` };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FoldHistoryCard', () => {
  it('caps the list at 8 entries and expands via the toggle', async () => {
    const items = Array.from({ length: 10 }, (_, index) => fold(index + 1));
    vi.spyOn(learningsApi, 'getFolds').mockResolvedValue(items);
    renderWithProviders(<FoldHistoryCard />, { route: '/learnings' });

    expect(await screen.findByText('skill-01')).toBeInTheDocument();
    expect(screen.getByText('skill-08')).toBeInTheDocument();
    expect(screen.queryByText('skill-09')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /Show all 10 folds/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(screen.getByText('skill-10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer' })).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.queryByText('skill-09')).not.toBeInTheDocument();
  });

  it('renders no toggle when the history fits', async () => {
    vi.spyOn(learningsApi, 'getFolds').mockResolvedValue([fold(1), fold(2)]);
    renderWithProviders(<FoldHistoryCard />, { route: '/learnings' });

    expect(await screen.findByText('skill-01')).toBeInTheDocument();
    expect(screen.getByText('skill-02')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument();
  });
});
