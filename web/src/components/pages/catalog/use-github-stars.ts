import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { fetchGithubStars, parseGithubRepoSlug } from './catalog-helpers';

const STARS_STALE_MS = 60 * 60 * 1000;

/** Star count for a GitHub-hosted source; null while loading, off GitHub, or rate-limited. */
export function useGithubStars(repoUrl: string): number | null {
  const slug = parseGithubRepoSlug(repoUrl);
  const stars = useQuery({
    queryKey: queryKeys.githubStars(slug ?? ''),
    queryFn: () => fetchGithubStars(slug ?? ''),
    enabled: slug !== null,
    staleTime: STARS_STALE_MS,
    gcTime: 24 * STARS_STALE_MS,
    retry: false,
    refetchOnWindowFocus: false
  });
  return stars.data ?? null;
}

/** Star counts for every unique GitHub repo in the list, batched into one cached query. */
export function useGithubStarsMap(repoUrls: string[]): Map<string, number> {
  const slugs = useMemo(
    () =>
      Array.from(new Set(repoUrls.map(parseGithubRepoSlug).filter((slug): slug is string => slug !== null))).sort(),
    [repoUrls]
  );
  const query = useQuery({
    queryKey: queryKeys.githubStars(`map:${slugs.join(',')}`),
    queryFn: async () => {
      const map = new Map<string, number>();
      await Promise.all(
        slugs.map(async (slug) => {
          const stars = await fetchGithubStars(slug);
          if (stars !== null) {
            map.set(slug, stars);
          }
        })
      );
      return map;
    },
    enabled: slugs.length > 0,
    staleTime: STARS_STALE_MS,
    gcTime: 24 * STARS_STALE_MS,
    retry: false,
    refetchOnWindowFocus: false
  });
  return query.data ?? new Map<string, number>();
}
