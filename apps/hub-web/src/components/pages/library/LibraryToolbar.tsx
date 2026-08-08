import { Search, Plus, Sparkles, Download, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { FilterKind, OwnershipFilter } from '@/types';

interface LibraryToolbarProps {
  assetCount: number;
  filterKind: FilterKind;
  ownership: OwnershipFilter;
  searchQuery: string;
  onOwnershipChange: (value: OwnershipFilter) => void;
  onSearchQueryChange: (value: string) => void;
  onCreate: () => void;
  onInstall: () => void;
  onDiscover: () => void;
  onUpdateSkills: () => void;
  isUpdatingSkills: boolean;
}

export function LibraryToolbar({
  assetCount,
  filterKind,
  ownership,
  searchQuery,
  onOwnershipChange,
  onSearchQueryChange,
  onCreate,
  onInstall,
  onDiscover,
  onUpdateSkills,
  isUpdatingSkills
}: LibraryToolbarProps) {
  const showSkillActions = filterKind === 'skills';

  return (
    <div className="grid min-w-0 shrink-0 gap-3 pb-4">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Assets</h1>
          <Badge variant="default">{assetCount}</Badge>
        </div>

        <TooltipProvider>
          <div className="flex shrink-0 items-center gap-2">
            <Button className="w-fit" onClick={onCreate} size="sm">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Create</span>
            </Button>

            {showSkillActions ? (
              <>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label="Install skill"
                        onClick={onInstall}
                        size="icon-sm"
                        variant="secondary"
                      >
                        <Download className="size-4" />
                      </Button>
                    }
                  />
                  <TooltipContent>Install skill</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label={isUpdatingSkills ? 'Updating skills' : 'Update skills'}
                        disabled={isUpdatingSkills}
                        onClick={onUpdateSkills}
                        size="icon-sm"
                        variant="secondary"
                      >
                        <RefreshCw className={cn('size-4', isUpdatingSkills && 'animate-spin')} />
                      </Button>
                    }
                  />
                  <TooltipContent>{isUpdatingSkills ? 'Updating…' : 'Update skills'}</TooltipContent>
                </Tooltip>
              </>
            ) : null}

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button aria-label="Discover" onClick={onDiscover} size="icon-sm" variant="secondary">
                    <Sparkles className="size-4" />
                  </Button>
                }
              />
              <TooltipContent>Discover</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search assets"
          className="h-9 pl-9"
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search name, path, or author"
          value={searchQuery}
        />
      </div>

      <Tabs
        className="gap-0"
        onValueChange={(value) => {
          if (value === 'all' || value === 'editable' || value === 'upstream') {
            onOwnershipChange(value);
          }
        }}
        value={ownership}
      >
        <TabsList aria-label="Filter by ownership">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="editable">Editable</TabsTrigger>
          <TabsTrigger value="upstream">Upstream</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
