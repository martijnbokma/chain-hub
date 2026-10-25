import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { catalogApi, libraryApi } from '@/lib/api';
import { makeAsset, renderWithProviders } from '@/test/render';
import type { CatalogEntryResult, CatalogResult } from '@/types';

import { CATALOG_GROUP_PAGE_SIZE, CatalogPage } from './CatalogPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

function makeEntry(overrides: Partial<CatalogEntryResult> = {}): CatalogEntryResult {
  return {
    id: 'finding-refactor',
    kind: 'skills',
    name: 'Finding refactor',
    description: 'Spot refactor candidates in a codebase.',
    author: 'Ada',
    license: 'MIT',
    category: 'code-quality',
    tags: ['refactor'],
    source: { repo: 'https://github.com/ada/skills', subdir: 'finding-refactor' },
    hasScripts: true,
    sourceId: 'official',
    installed: false,
    installedName: null,
    ...overrides
  };
}

const findingRefactor = makeEntry();
const pdfTool = makeEntry({
  id: 'pdf-tool',
  name: 'PDF tool',
  description: 'Work with PDFs.',
  category: 'productivity',
  tags: ['pdf'],
  hasScripts: false,
  installed: true,
  installedName: 'pdf-tool'
});
const reviewer = makeEntry({
  id: 'reviewer',
  kind: 'agents',
  name: 'Reviewer',
  description: 'Reviews pull requests.',
  author: 'Grace',
  category: 'testing',
  tags: ['qa'],
  hasScripts: false,
  installed: true,
  installedName: 'reviewer'
});
const release = makeEntry({
  id: 'release',
  kind: 'workflows',
  name: 'Release',
  description: 'Cut a release.',
  author: undefined,
  category: 'devops',
  tags: [],
  hasScripts: false
});

function catalogResult(overrides: Partial<CatalogResult> = {}): CatalogResult {
  return {
    entries: [findingRefactor, pdfTool, reviewer, release],
    stale: false,
    checkedAt: '2026-10-24T00:00:00.000Z',
    ...overrides
  };
}

beforeEach(() => {
  vi.spyOn(catalogApi, 'getAll').mockResolvedValue(catalogResult());
  vi.spyOn(libraryApi, 'checkSkillUpdates').mockResolvedValue({
    results: [],
    checkedAt: '2026-10-24T00:00:00.000Z'
  });
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async () => new Response(JSON.stringify({ stargazers_count: 1234 }))
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function entryCard(name: RegExp) {
  return screen.getByRole('button', { name });
}

describe('CatalogPage', () => {
  it('lists entries with kind, installed state, and GitHub stars', async () => {
    renderWithProviders(<CatalogPage />, { route: '/catalog' });

    expect(await screen.findByRole('button', { name: /Finding refactor/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Catalog' })).toBeInTheDocument();
    expect(within(entryCard(/Reviewer/)).getByText('Installed')).toBeInTheDocument();
    expect(within(entryCard(/Finding refactor/)).queryByText('Installed')).not.toBeInTheDocument();
    expect(within(entryCard(/Finding refactor/)).getByText('by Ada')).toBeInTheDocument();
    expect(within(entryCard(/Finding refactor/)).getByText('Code quality')).toBeInTheDocument();
    expect((await screen.findAllByText('1.2k')).length).toBeGreaterThan(0);
  });

  it('still renders when the GitHub stars request fails', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('rate limited'));
    renderWithProviders(<CatalogPage />, { route: '/catalog' });

    expect(await screen.findByRole('button', { name: /Finding refactor/ })).toBeInTheDocument();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(screen.queryByText('1.2k')).not.toBeInTheDocument();
  });

  it('filters by search, kind tab, and category', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CatalogPage />, { route: '/catalog' });
    await screen.findByRole('button', { name: /Finding refactor/ });

    await user.type(screen.getByLabelText('Search catalog'), 'grace');
    expect(entryCard(/Reviewer/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Finding refactor/ })).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search catalog'));
    await user.click(screen.getByRole('tab', { name: 'Workflows' }));
    expect(entryCard(/Release/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reviewer/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'All' }));
    await user.selectOptions(screen.getByLabelText('Filter by category'), 'productivity');
    expect(entryCard(/PDF tool/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Finding refactor/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Release/ })).not.toBeInTheDocument();
  });

  it('switches kind tabs with arrow keys', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CatalogPage />, { route: '/catalog' });
    await screen.findByRole('button', { name: /Finding refactor/ });

    screen.getByRole('tab', { name: 'All' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Skills' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Skills' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: /Reviewer/ })).not.toBeInTheDocument();

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Workflows' })).toHaveAttribute('aria-selected', 'true');
    expect(entryCard(/Release/)).toBeInTheDocument();
  });

  it('renders large groups in pages with a show-more control', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: CATALOG_GROUP_PAGE_SIZE + 5 }, (_, index) =>
      makeEntry({ id: `bulk-skill-${index}`, name: `Bulk skill ${index}` })
    );
    vi.mocked(catalogApi.getAll).mockResolvedValue(catalogResult({ entries: many }));
    renderWithProviders(<CatalogPage />, { route: '/catalog' });

    expect(await screen.findByRole('button', { name: /Bulk skill 0\b/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Bulk skill/ })).toHaveLength(CATALOG_GROUP_PAGE_SIZE);

    await user.click(screen.getByRole('button', { name: 'Show 5 more' }));
    expect(screen.getAllByRole('button', { name: /Bulk skill/ })).toHaveLength(CATALOG_GROUP_PAGE_SIZE + 5);
    expect(screen.queryByRole('button', { name: /Show \d+ more/ })).not.toBeInTheDocument();
  });

  it('honours kind and category deep links', async () => {
    renderWithProviders(<CatalogPage />, { route: '/catalog?kind=agents&category=testing' });

    expect(await screen.findByRole('button', { name: /Reviewer/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Finding refactor/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Filter by category')).toHaveValue('testing');
  });

  it('shows entry details with source, license, tags, and the scripts warning', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CatalogPage />, { route: '/catalog' });

    await user.click(await screen.findByRole('button', { name: /Finding refactor/ }));
    const panel = screen.getByRole('region', { name: 'Finding refactor details' });

    expect(within(panel).getByText('Spot refactor candidates in a codebase.')).toBeInTheDocument();
    expect(within(panel).getByText('MIT')).toBeInTheDocument();
    expect(within(panel).getByText('refactor')).toBeInTheDocument();
    expect(within(panel).getByText(/bundles executable scripts/)).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /github\.com\/ada\/skills/ })).toHaveAttribute(
      'href',
      'https://github.com/ada/skills/tree/HEAD/finding-refactor'
    );
    expect(within(panel).getByRole('button', { name: 'Install' })).toBeInTheDocument();
  });

  it('installs an entry on explicit click and shows it as installed', async () => {
    const user = userEvent.setup();
    const install = vi.spyOn(catalogApi, 'install').mockResolvedValue({
      asset: makeAsset({ kind: 'skills', name: 'finding-refactor' }),
      scriptsDetected: true
    });
    renderWithProviders(<CatalogPage />, { route: '/catalog' });

    await user.click(await screen.findByRole('button', { name: /Finding refactor/ }));
    expect(install).not.toHaveBeenCalled();

    vi.mocked(catalogApi.getAll).mockResolvedValue(
      catalogResult({
        entries: [{ ...findingRefactor, installed: true, installedName: 'finding-refactor' }, pdfTool, reviewer, release]
      })
    );
    const panel = screen.getByRole('region', { name: 'Finding refactor details' });
    await user.click(within(panel).getByRole('button', { name: 'Install' }));

    expect(install).toHaveBeenCalledWith({ sourceId: 'official', entryId: 'finding-refactor' });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Installed skills/finding-refactor'));
    expect(toast.warning).not.toHaveBeenCalled();
    expect(await within(panel).findByRole('button', { name: /Open in Library/ })).toBeInTheDocument();
    expect(within(panel).getByText('Installed')).toBeInTheDocument();
  });

  it('surfaces install errors without retrying', async () => {
    const user = userEvent.setup();
    const install = vi
      .spyOn(catalogApi, 'install')
      .mockRejectedValue(new Error('skills/finding-refactor already exists. Use --force to overwrite.'));
    renderWithProviders(<CatalogPage />, { route: '/catalog' });

    await user.click(await screen.findByRole('button', { name: /Finding refactor/ }));
    await user.click(screen.getByRole('button', { name: 'Install' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('skills/finding-refactor already exists. Use --force to overwrite.')
    );
    expect(install).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Install' })).toBeEnabled();
  });

  it('marks installed skills with an upstream update', async () => {
    vi.mocked(libraryApi.checkSkillUpdates).mockResolvedValue({
      results: [{ name: 'pdf-tool', status: 'update_available', source: 'https://github.com/ada/skills' }],
      checkedAt: '2026-10-24T00:00:00.000Z'
    });
    renderWithProviders(<CatalogPage />, { route: '/catalog' });

    await screen.findByRole('button', { name: /PDF tool/ });
    expect(await within(entryCard(/PDF tool/)).findByText('Update available')).toBeInTheDocument();
    expect(within(entryCard(/Finding refactor/)).queryByText('Update available')).not.toBeInTheDocument();
  });

  it('flags a stale catalog and retries with a refresh', async () => {
    const user = userEvent.setup();
    vi.mocked(catalogApi.getAll).mockResolvedValue(catalogResult({ stale: true }));
    renderWithProviders(<CatalogPage />, { route: '/catalog' });

    expect(await screen.findByText(/Showing the last cached catalog/)).toBeInTheDocument();
    vi.mocked(catalogApi.getAll).mockResolvedValue(catalogResult());
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(catalogApi.getAll).toHaveBeenCalledWith({ refresh: true });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Catalog refreshed'));
    expect(screen.queryByText(/Showing the last cached catalog/)).not.toBeInTheDocument();
  });

  it('explains why an empty catalog could not be fetched', async () => {
    vi.mocked(catalogApi.getAll).mockResolvedValue(
      catalogResult({
        entries: [],
        stale: true,
        failures: [{ sourceId: 'chain-hub', error: 'Catalog index fetch failed (404): https://example.com/catalog.json' }]
      })
    );
    renderWithProviders(<CatalogPage />, { route: '/catalog' });

    expect(await screen.findByText('The catalog could not be fetched.')).toBeInTheDocument();
    expect(
      screen.getByText('chain-hub: Catalog index fetch failed (404): https://example.com/catalog.json')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Check your connection/)).not.toBeInTheDocument();
  });
});
