import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CloudOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { catalogApi, errorMessage, libraryApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import type { CatalogEntryResult } from '@/types';
import { CatalogDetailPanel } from './catalog/CatalogDetailPanel';
import { CatalogEntryCard } from './catalog/CatalogEntryCard';
import { CatalogToolbar } from './catalog/CatalogToolbar';
import {
  catalogEntryKey,
  describeCatalogFailures,
  filterCatalogEntries,
  groupCatalogEntriesByKind,
  collectCatalogTags,
  parseCatalogCategoryParam,
  parseCatalogKindParam,
  parseCatalogSortParam,
  parseCatalogTagParam,
  sortCatalogEntries,
  type CatalogCategoryFilter,
  type CatalogKindFilter,
  type CatalogSortFilter,
  type CatalogTagFilter
} from './catalog/catalog-helpers';
import { useGithubStarsMap } from './catalog/use-github-stars';
import { resolveKindMeta } from './library/asset-helpers';

const PAGE_FRAME = 'flex h-[calc(100vh-2rem)] min-w-0 flex-col -mb-4 sm:-mb-6 sm:h-[calc(100vh-3rem)]';
export const CATALOG_GROUP_PAGE_SIZE = 60;

export function CatalogPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const kind = parseCatalogKindParam(searchParams.get('kind'));
  const category = parseCatalogCategoryParam(searchParams.get('category'));
  const tag = parseCatalogTagParam(searchParams.get('tag'));
  const sort = parseCatalogSortParam(searchParams.get('sort'));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const [scrollFade, setScrollFade] = useState({ top: false, bottom: false });

  const catalog = useQuery({
    queryKey: queryKeys.catalog,
    queryFn: () => catalogApi.getAll()
  });
  const entries = useMemo(() => catalog.data?.entries ?? [], [catalog.data]);

  const hasInstalledSkills = entries.some((entry) => entry.kind === 'skills' && entry.installed);
  const skillUpdateCheck = useQuery({
    queryKey: queryKeys.skillUpdates,
    queryFn: () => libraryApi.checkSkillUpdates(),
    enabled: hasInstalledSkills,
    staleTime: 5 * 60 * 1000
  });
  const skillsWithUpdates = useMemo(
    () =>
      new Set(
        (skillUpdateCheck.data?.results ?? [])
          .filter((item) => item.status === 'update_available')
          .map((item) => item.name)
      ),
    [skillUpdateCheck.data]
  );
  const hasUpdate = (entry: CatalogEntryResult) =>
    entry.installed && entry.kind === 'skills' && skillsWithUpdates.has(entry.installedName ?? entry.id);

  const refresh = useMutation({
    mutationFn: () => catalogApi.getAll({ refresh: true }),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.catalog, result);
      if (result.stale) {
        toast.warning('Could not reach every catalog source', {
          description: describeCatalogFailures(result.failures) ?? 'Showing the last cached index.'
        });
      } else {
        toast.success('Catalog refreshed');
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to refresh catalog'));
    }
  });

  const install = useMutation({
    mutationFn: (entry: CatalogEntryResult) => catalogApi.install({ sourceId: entry.sourceId, entryId: entry.id }),
    onSuccess: async (result, entry) => {
      toast.success(`Installed ${result.asset.kind}/${result.asset.name}`);
      if (result.scriptsDetected && !entry.hasScripts) {
        toast.warning('This asset bundles undeclared scripts', {
          description: 'Review them in Library before use. Chain Hub never runs scripts on install.'
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.catalog }),
        queryClient.invalidateQueries({ queryKey: queryKeys.library }),
        queryClient.invalidateQueries({ queryKey: queryKeys.overview })
      ]);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to install catalog entry'));
    }
  });

  const repoUrls = useMemo(() => entries.map((entry) => entry.source.repo), [entries]);
  const starsByRepo = useGithubStarsMap(repoUrls);
  const tags = useMemo(() => collectCatalogTags(entries), [entries]);
  const filtered = useMemo(
    () => filterCatalogEntries(entries, { kind, category, tag, query: searchQuery }),
    [entries, kind, category, tag, searchQuery]
  );
  const sorted = useMemo(() => sortCatalogEntries(filtered, sort, starsByRepo), [filtered, sort, starsByRepo]);
  const grouped = useMemo(() => groupCatalogEntriesByKind(sorted), [sorted]);
  const filterSignature = `${kind}|${category}|${tag}|${sort}|${searchQuery}`;
  const [groupLimits, setGroupLimits] = useState<{ signature: string; limits: Record<string, number> }>({
    signature: filterSignature,
    limits: {}
  });
  const limitFor = (groupKind: string) =>
    (groupLimits.signature === filterSignature ? groupLimits.limits[groupKind] : undefined) ?? CATALOG_GROUP_PAGE_SIZE;
  const showMore = (groupKind: string) =>
    setGroupLimits({
      signature: filterSignature,
      limits: {
        ...(groupLimits.signature === filterSignature ? groupLimits.limits : {}),
        [groupKind]: limitFor(groupKind) + CATALOG_GROUP_PAGE_SIZE
      }
    });
  const selected = entries.find((entry) => catalogEntryKey(entry) === selectedKey) ?? null;

  const setFilterParam = (key: 'kind' | 'category' | 'tag' | 'sort', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === '__all__' || (key === 'sort' && value === 'relevance')) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const element = listScrollRef.current;
    if (!element) {
      return;
    }
    const update = () => {
      setScrollFade({
        top: element.scrollTop > 0,
        bottom: element.scrollTop + element.clientHeight < element.scrollHeight - 1
      });
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    return () => {
      element.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [filtered.length, selected, catalog.isLoading]);

  const toolbar = (
    <CatalogToolbar
      category={category}
      entryCount={filtered.length}
      isCompact={selected !== null}
      isRefreshing={refresh.isPending}
      kind={kind}
      onCategoryChange={(value: CatalogCategoryFilter) => setFilterParam('category', value)}
      onKindChange={(value: CatalogKindFilter) => setFilterParam('kind', value)}
      onRefresh={() => refresh.mutate()}
      onSearchQueryChange={setSearchQuery}
      onSortChange={(value: CatalogSortFilter) => setFilterParam('sort', value)}
      onTagChange={(value: CatalogTagFilter) => setFilterParam('tag', value)}
      searchQuery={searchQuery}
      sort={sort}
      tag={tag}
      tags={tags}
    />
  );

  if (catalog.isLoading) {
    return (
      <div className={PAGE_FRAME}>
        {toolbar}
        <PageSkeleton className="min-h-0 flex-1" variant="workspace" />
      </div>
    );
  }

  if (catalog.isError) {
    return (
      <div className={PAGE_FRAME}>
        {toolbar}
        <EmptyState description="The catalog index is temporarily unavailable." title="Unable to load catalog" />
      </div>
    );
  }

  const failureDetail = describeCatalogFailures(catalog.data?.failures);

  return (
    <div className={PAGE_FRAME}>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {catalog.data?.stale ? (
          <div className="min-w-0 shrink-0 pb-3">
            <Alert className="items-center" variant="warning">
              <AlertIcon>
                <CloudOff />
              </AlertIcon>
              <AlertDescription>
                <p>
                  {entries.length > 0
                    ? 'Showing the last cached catalog. Some sources could not be refreshed.'
                    : failureDetail
                      ? 'The catalog could not be fetched.'
                      : 'The catalog has not been fetched yet. Check your connection and refresh.'}
                </p>
                {failureDetail ? <p className="mt-1 break-words text-xs opacity-80">{failureDetail}</p> : null}
              </AlertDescription>
              <Button
                className="ml-auto shrink-0"
                loading={refresh.isPending}
                onClick={() => refresh.mutate()}
                size="sm"
                variant="secondary"
              >
                Retry
              </Button>
            </Alert>
          </div>
        ) : null}

        <div
          className={cn(
            'grid min-h-0 min-w-0 flex-1 gap-4',
            selected ? 'xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]' : 'grid-cols-1'
          )}
        >
          <div className={cn('flex min-h-0 min-w-0 flex-col', selected && 'hidden xl:flex')}>
            {toolbar}
            <div className="relative min-h-0 min-w-0 flex-1">
              <div
                className={cn(
                  'h-full min-w-0 overflow-y-auto pb-4 pr-1',
                  scrollFade.top && 'fade-top',
                  scrollFade.bottom && 'fade-bottom'
                )}
                ref={listScrollRef}
              >
                {filtered.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    {entries.length === 0
                      ? 'No catalog entries yet. Refresh once you are online.'
                      : 'No catalog entries match the current search and filters.'}
                  </div>
                ) : (
                  <div className="grid min-w-0 gap-6">
                    {grouped.map(([groupKind, groupEntries]) => {
                      const limit = limitFor(groupKind);
                      const hidden = groupEntries.length - limit;
                      return (
                      <section aria-label={`${resolveKindMeta(groupKind).label} entries`} className="grid min-w-0 gap-3" key={groupKind}>
                        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {resolveKindMeta(groupKind).label}s · {groupEntries.length}
                        </h2>
                        <div
                          className={cn(
                            'grid min-w-0 gap-3',
                            selected ? 'grid-cols-1' : 'sm:grid-cols-2 2xl:grid-cols-3'
                          )}
                        >
                          {groupEntries.slice(0, limit).map((entry) => {
                            const key = catalogEntryKey(entry);
                            return (
                              <CatalogEntryCard
                                compact={selected !== null}
                                entry={entry}
                                key={key}
                                onSelect={() => setSelectedKey(key)}
                                selected={key === selectedKey}
                                updateAvailable={hasUpdate(entry)}
                              />
                            );
                          })}
                        </div>
                        {hidden > 0 ? (
                          <Button className="justify-self-start" onClick={() => showMore(groupKind)} size="sm" variant="secondary">
                            Show {Math.min(hidden, CATALOG_GROUP_PAGE_SIZE)} more
                          </Button>
                        ) : null}
                      </section>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {selected ? (
            <CatalogDetailPanel
              entry={selected}
              isInstalling={install.isPending && install.variables === selected}
              onBack={() => setSelectedKey(null)}
              onInstall={() => install.mutate(selected)}
              onOpenInLibrary={() =>
                navigate(
                  `/library?kind=${encodeURIComponent(selected.kind)}&asset=${encodeURIComponent(selected.installedName ?? selected.id)}`
                )
              }
              updateAvailable={hasUpdate(selected)}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
