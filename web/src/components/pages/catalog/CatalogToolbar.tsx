import { RefreshCw, Search } from 'lucide-react';
import { catalogCategories } from '@chain-hub/contracts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  CATALOG_CATEGORY_LABELS,
  CATALOG_SORT_LABELS,
  catalogSorts,
  parseCatalogCategoryParam,
  parseCatalogKindParam,
  parseCatalogSortParam,
  type CatalogCategoryFilter,
  type CatalogKindFilter,
  type CatalogSortFilter,
  type CatalogTagFilter
} from './catalog-helpers';

interface CatalogToolbarProps {
  entryCount: number;
  isCompact: boolean;
  kind: CatalogKindFilter;
  category: CatalogCategoryFilter;
  tag: CatalogTagFilter;
  tags: string[];
  sort: CatalogSortFilter;
  searchQuery: string;
  isRefreshing: boolean;
  onKindChange: (value: CatalogKindFilter) => void;
  onCategoryChange: (value: CatalogCategoryFilter) => void;
  onTagChange: (value: CatalogTagFilter) => void;
  onSortChange: (value: CatalogSortFilter) => void;
  onSearchQueryChange: (value: string) => void;
  onRefresh: () => void;
}

export function CatalogToolbar({
  entryCount,
  isCompact,
  kind,
  category,
  tag,
  tags,
  sort,
  searchQuery,
  isRefreshing,
  onKindChange,
  onCategoryChange,
  onTagChange,
  onSortChange,
  onSearchQueryChange,
  onRefresh
}: CatalogToolbarProps) {
  return (
    <div className="grid min-w-0 shrink-0 gap-3 pb-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Catalog</h1>
          <Badge variant="default">{entryCount}</Badge>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={isRefreshing ? 'Refreshing catalog' : 'Refresh catalog'}
                  disabled={isRefreshing}
                  onClick={onRefresh}
                  size="icon-sm"
                  variant="secondary"
                >
                  <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
                </Button>
              }
            />
            <TooltipContent>{isRefreshing ? 'Refreshing…' : 'Refresh catalog'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className={cn('flex min-w-0 flex-col gap-3', !isCompact && 'lg:flex-row lg:items-center')}>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search catalog"
            className="h-9 pl-9"
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search name, description, author, or tag"
            value={searchQuery}
          />
        </div>

        <div className={cn('flex min-w-0 flex-col gap-3', !isCompact && 'sm:flex-row sm:items-center')}>
          <Tabs
            className={cn('shrink-0 gap-0', isCompact ? 'w-full' : 'w-full sm:w-auto')}
            onValueChange={(value) => onKindChange(parseCatalogKindParam(typeof value === 'string' ? value : null))}
            value={kind}
          >
            <TabsList aria-label="Filter by kind" className={cn(isCompact ? 'w-full' : 'w-full sm:w-auto')}>
              <TabsTrigger value="__all__">All</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select
            aria-label="Filter by category"
            className={cn('shrink-0', isCompact ? 'w-full' : 'w-full sm:w-48')}
            onChange={(event) => onCategoryChange(parseCatalogCategoryParam(event.target.value))}
            value={category}
          >
            <option value="__all__">All categories</option>
            {catalogCategories.map((value) => (
              <option key={value} value={value}>
                {CATALOG_CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by tag"
            className={cn('shrink-0', isCompact ? 'w-full' : 'w-full sm:w-44')}
            onChange={(event) => onTagChange(event.target.value || '__all__')}
            value={tag}
          >
            <option value="__all__">All tags</option>
            {tags.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Sort catalog"
            className={cn('shrink-0', isCompact ? 'w-full' : 'w-full sm:w-44')}
            onChange={(event) => onSortChange(parseCatalogSortParam(event.target.value))}
            value={sort}
          >
            {catalogSorts.map((value) => (
              <option key={value} value={value}>
                {CATALOG_SORT_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
