import {
  catalogCategories,
  catalogKinds,
  type CatalogCategory,
  type CatalogEntryResult,
  type CatalogKind,
  type CatalogResult
} from '@chain-hub/contracts';

/** Catalog kind tab: all kinds or one catalog kind. */
export type CatalogKindFilter = CatalogKind | '__all__';

/** Catalog category dropdown: all categories or one fixed category. */
export type CatalogCategoryFilter = CatalogCategory | '__all__';

export const CATALOG_CATEGORY_LABELS = {
  'code-quality': 'Code quality',
  design: 'Design',
  docs: 'Docs',
  testing: 'Testing',
  devops: 'DevOps',
  research: 'Research',
  writing: 'Writing',
  productivity: 'Productivity',
  'editor-integration': 'Editor integration',
  other: 'Other'
} as const satisfies Record<CatalogCategory, string>;

export function parseCatalogKindParam(value: string | null): CatalogKindFilter {
  return (catalogKinds as readonly string[]).includes(value ?? '') ? (value as CatalogKind) : '__all__';
}

export function parseCatalogCategoryParam(value: string | null): CatalogCategoryFilter {
  return (catalogCategories as readonly string[]).includes(value ?? '') ? (value as CatalogCategory) : '__all__';
}

/** Entry ids are unique per catalog only, so selection keys include the source. */
export function catalogEntryKey(entry: Pick<CatalogEntryResult, 'id' | 'sourceId'>): string {
  return `${entry.id}@${entry.sourceId}`;
}

export function filterCatalogEntries(
  entries: CatalogEntryResult[],
  filters: { kind: CatalogKindFilter; category: CatalogCategoryFilter; tag: CatalogTagFilter; query: string }
): CatalogEntryResult[] {
  const query = filters.query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (filters.kind !== '__all__' && entry.kind !== filters.kind) {
      return false;
    }
    if (filters.category !== '__all__' && entry.category !== filters.category) {
      return false;
    }
    if (filters.tag !== '__all__' && !entry.tags.includes(filters.tag)) {
      return false;
    }
    if (!query) {
      return true;
    }
    return [entry.id, entry.name, entry.description, entry.author ?? '', ...entry.tags].some((value) =>
      value.toLowerCase().includes(query)
    );
  });
}

/** Groups entries by kind in catalog kind order, skipping empty kinds. */
export function groupCatalogEntriesByKind(entries: CatalogEntryResult[]): [string, CatalogEntryResult[]][] {
  const groups = new Map<string, CatalogEntryResult[]>();
  for (const entry of entries) {
    groups.set(entry.kind, [...(groups.get(entry.kind) ?? []), entry]);
  }
  const order = catalogKinds as readonly string[];
  const rank = (kind: string) => (order.includes(kind) ? order.indexOf(kind) : order.length);
  return Array.from(groups.entries()).sort(([a], [b]) => rank(a) - rank(b));
}

/** `owner/repo` for GitHub https or ssh URLs; null for any other host or local path. */
export function parseGithubRepoSlug(repoUrl: string): string | null {
  const match = repoUrl
    .trim()
    .match(/^(?:https?:\/\/(?:www\.)?github\.com\/|git@github\.com:)([^/\s]+)\/([^/\s#?]+?)(?:\.git)?\/?$/i);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return `${match[1]}/${match[2]}`;
}

/** Browsable URL for an entry's source (GitHub tree view for subdirs), or null when not linkable. */
export function resolveCatalogSourceUrl(source: CatalogEntryResult['source']): string | null {
  const slug = parseGithubRepoSlug(source.repo);
  if (slug) {
    const base = `https://github.com/${slug}`;
    return source.subdir ? `${base}/tree/${source.ref ?? 'HEAD'}/${source.subdir.replace(/^\/+/, '')}` : base;
  }
  return /^https?:\/\//i.test(source.repo) ? source.repo : null;
}

/** Unauthenticated GitHub star count (60 req/h/IP); any failure degrades to null. */
export async function fetchGithubStars(slug: string): Promise<number | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${slug}`, {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { stargazers_count?: unknown };
    return typeof payload.stargazers_count === 'number' ? payload.stargazers_count : null;
  } catch {
    return null;
  }
}

export function formatStarCount(stars: number): string {
  if (stars < 1000) {
    return String(stars);
  }
  const thousands = stars / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '')}k`;
}

/** One-line reason behind a stale catalog, e.g. `chain-hub: Catalog index fetch failed (404): …`. */
export function describeCatalogFailures(failures: CatalogResult['failures']): string | null {
  if (!failures || failures.length === 0) {
    return null;
  }
  return failures.map((failure) => `${failure.sourceId}: ${failure.error}`).join(' · ');
}

/** Catalog sort dropdown: default relevance or one of the signal-based orderings. */
export type CatalogSortFilter = 'relevance' | 'stars' | 'newest' | 'active';
export const catalogSorts = ['relevance', 'stars', 'newest', 'active'] as const;

export const CATALOG_SORT_LABELS = {
  relevance: 'Relevance',
  stars: 'Most starred',
  newest: 'Recently added',
  active: 'Recently updated'
} as const satisfies Record<CatalogSortFilter, string>;

export function parseCatalogSortParam(value: string | null): CatalogSortFilter {
  return (catalogSorts as readonly string[]).includes(value ?? '') ? (value as CatalogSortFilter) : 'relevance';
}

/** Catalog tag dropdown: all tags or one tag already present on an entry. */
export type CatalogTagFilter = string;

export function parseCatalogTagParam(value: string | null): CatalogTagFilter {
  return value && value.trim() ? value.trim() : '__all__';
}

/** Unique sorted tag list across the visible entries, for the theme/tag filter. */
export function collectCatalogTags(entries: CatalogEntryResult[]): string[] {
  const tags = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

/** Orders entries for display; signals absent on an entry sort it last within its group. */
export function sortCatalogEntries(
  entries: CatalogEntryResult[],
  sort: CatalogSortFilter,
  starsByRepo: Map<string, number>
): CatalogEntryResult[] {
  if (sort === 'relevance') {
    return entries;
  }
  const score = (entry: CatalogEntryResult): number | null => {
    switch (sort) {
      case 'stars': {
        const slug = parseGithubRepoSlug(entry.source.repo);
        return (slug === null ? undefined : starsByRepo.get(slug)) ?? entry.stats?.stars ?? null;
      }
      case 'newest':
        return entry.addedAt ? Date.parse(entry.addedAt) : null;
      case 'active':
        return entry.stats?.pushedAt ? Date.parse(entry.stats.pushedAt) : null;
    }
  };
  return [...entries].sort((a, b) => (score(b) ?? -1) - (score(a) ?? -1));
}
