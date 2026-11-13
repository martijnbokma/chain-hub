import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CatalogEntryResult } from '@/types';
import {
  catalogEntryKey,
  describeCatalogFailures,
  fetchGithubStars,
  filterCatalogEntries,
  formatStarCount,
  groupCatalogEntriesByKind,
  parseCatalogCategoryParam,
  parseCatalogKindParam,
  parseGithubRepoSlug,
  resolveCatalogSourceUrl
} from './catalog-helpers';

describe('describeCatalogFailures', () => {
  it('joins per-source reasons and returns null when there are none', () => {
    expect(describeCatalogFailures(undefined)).toBeNull();
    expect(describeCatalogFailures([])).toBeNull();
    expect(
      describeCatalogFailures([
        { sourceId: 'chain-hub', error: 'Catalog index fetch failed (404)' },
        { sourceId: 'team', error: 'timeout' }
      ])
    ).toBe('chain-hub: Catalog index fetch failed (404) · team: timeout');
  });
});

function makeEntry(overrides: Partial<CatalogEntryResult> = {}): CatalogEntryResult {
  return {
    id: 'finding-refactor',
    kind: 'skills',
    name: 'Finding refactor',
    description: 'Spot refactor candidates.',
    author: 'Ada',
    license: 'MIT',
    category: 'code-quality',
    tags: ['refactor'],
    source: { repo: 'https://github.com/ada/skills', subdir: 'finding-refactor' },
    hasScripts: false,
    sourceId: 'official',
    installed: false,
    installedName: null,
    ...overrides
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('catalog filters', () => {
  const entries = [
    makeEntry(),
    makeEntry({ id: 'reviewer', kind: 'agents', name: 'Reviewer', category: 'testing', tags: ['qa'], author: 'Grace' }),
    makeEntry({ id: 'release', kind: 'workflows', name: 'Release', category: 'devops', tags: [], author: undefined })
  ];

  it('filters by kind, category, and query across name, description, author, and tags', () => {
    expect(filterCatalogEntries(entries, { kind: 'agents', category: '__all__', tag: '__all__', query: '' }).map((e) => e.id)).toEqual([
      'reviewer'
    ]);
    expect(filterCatalogEntries(entries, { kind: '__all__', category: 'devops', tag: '__all__', query: '' }).map((e) => e.id)).toEqual([
      'release'
    ]);
    expect(filterCatalogEntries(entries, { kind: '__all__', category: '__all__', tag: '__all__', query: 'grace' }).map((e) => e.id)).toEqual([
      'reviewer'
    ]);
    expect(filterCatalogEntries(entries, { kind: '__all__', category: '__all__', tag: '__all__', query: 'QA' }).map((e) => e.id)).toEqual([
      'reviewer'
    ]);
  });

  it('groups entries in catalog kind order', () => {
    expect(groupCatalogEntriesByKind([...entries].reverse()).map(([kind]) => kind)).toEqual([
      'skills',
      'agents',
      'workflows'
    ]);
  });

  it('parses URL params defensively', () => {
    expect(parseCatalogKindParam('agents')).toBe('agents');
    expect(parseCatalogKindParam('rules')).toBe('__all__');
    expect(parseCatalogCategoryParam('design')).toBe('design');
    expect(parseCatalogCategoryParam(null)).toBe('__all__');
    expect(catalogEntryKey(makeEntry())).toBe('finding-refactor@official');
  });
});

describe('catalog sources', () => {
  it('parses GitHub https and ssh URLs only', () => {
    expect(parseGithubRepoSlug('https://github.com/ada/skills')).toBe('ada/skills');
    expect(parseGithubRepoSlug('https://github.com/ada/skills.git')).toBe('ada/skills');
    expect(parseGithubRepoSlug('git@github.com:ada/skills.git')).toBe('ada/skills');
    expect(parseGithubRepoSlug('https://gitlab.com/ada/skills')).toBeNull();
    expect(parseGithubRepoSlug('/tmp/skills')).toBeNull();
  });

  it('builds a browsable source URL', () => {
    expect(resolveCatalogSourceUrl({ repo: 'https://github.com/ada/skills', subdir: 'a/b', ref: 'v1' })).toBe(
      'https://github.com/ada/skills/tree/v1/a/b'
    );
    expect(resolveCatalogSourceUrl({ repo: 'git@github.com:ada/skills.git' })).toBe('https://github.com/ada/skills');
    expect(resolveCatalogSourceUrl({ repo: 'https://gitlab.com/ada/skills' })).toBe('https://gitlab.com/ada/skills');
    expect(resolveCatalogSourceUrl({ repo: '/tmp/skills' })).toBeNull();
  });

  it('formats star counts compactly', () => {
    expect(formatStarCount(999)).toBe('999');
    expect(formatStarCount(1200)).toBe('1.2k');
    expect(formatStarCount(3000)).toBe('3k');
    expect(formatStarCount(15400)).toBe('15k');
  });

  it('returns stars and degrades failures to null', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ stargazers_count: 42 })));
    await expect(fetchGithubStars('ada/skills')).resolves.toBe(42);
    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/ada/skills', expect.anything());

    fetchMock.mockResolvedValueOnce(new Response('rate limited', { status: 403 }));
    await expect(fetchGithubStars('ada/skills')).resolves.toBeNull();

    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(fetchGithubStars('ada/skills')).resolves.toBeNull();
  });
});
