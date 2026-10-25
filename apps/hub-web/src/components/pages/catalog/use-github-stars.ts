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
