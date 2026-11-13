import { Search, Plus, Sparkles, Download, ScanSearch } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { FilterKind, OwnershipFilter } from '@/types';

import { SkillUpdateMenu, type SkillUpdateItem } from './SkillUpdateMenu';

interface LibraryToolbarProps {
  assetCount: number;
  filterKind: FilterKind;
  isCompact: boolean;
  view: 'assets' | 'review';
  reviewOpenCount: number;
  onViewChange: (view: 'assets' | 'review') => void;
  ownership: OwnershipFilter;
  searchQuery: string;
  onOwnershipChange: (value: OwnershipFilter) => void;
  onSearchQueryChange: (value: string) => void;
  onCreate: () => void;
  onInstall: () => void;
  onDiscover: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onUpdateSkills: () => void;
  onUpdateSkill: (name: string) => void;
  isUpdatingSkills: boolean;
  skillUpdateItems?: SkillUpdateItem[];
}

export function LibraryToolbar({
  assetCount,
  filterKind,
  isCompact,
  view,
  reviewOpenCount,
  onViewChange,
  ownership,
  searchQuery,
  onOwnershipChange,
  onSearchQueryChange,
  onCreate,
  onInstall,
  onDiscover,
  onAnalyze,
  isAnalyzing,
  onUpdateSkills,
  onUpdateSkill,
  isUpdatingSkills,
  skillUpdateItems = []
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
            {isCompact ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button aria-label="Create asset" onClick={onCreate} size="icon-sm">
                      <Plus className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>Create asset</TooltipContent>
              </Tooltip>
            ) : (
              <Button className="w-fit" onClick={onCreate} size="sm">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            )}

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

                <SkillUpdateMenu
                  isCompact={isCompact}
                  isUpdatingSkills={isUpdatingSkills}
                  items={skillUpdateItems}
                  onUpdateSkill={onUpdateSkill}
                  onUpdateSkills={onUpdateSkills}
                />
              </>
            ) : null}

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={isAnalyzing ? 'Analyzing assets' : 'Analyze assets'}
                    onClick={onAnalyze}
                    size="icon-sm"
                    variant="secondary"
                  >
                    <ScanSearch className={cn('size-4', isAnalyzing && 'animate-pulse')} />
                  </Button>
                }
              />
              <TooltipContent>{isAnalyzing ? 'Analyzing…' : 'Analyze'}</TooltipContent>
            </Tooltip>

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

      <div
        className={cn(
          'flex min-w-0 flex-col gap-3',
          !isCompact && 'lg:flex-row lg:items-center'
        )}
      >
        <Tabs
          className="shrink-0 gap-0"
          onValueChange={(value) => {
            if (value === 'assets' || value === 'review') {
              onViewChange(value);
            }
          }}
          value={view}
        >
          <TabsList aria-label="Library view">
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="review">
              Review
              {reviewOpenCount > 0 ? (
                <Badge className="ml-1.5 px-1.5 py-0" variant="accent">
                  {reviewOpenCount}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {view === 'assets' ? (
          <>
        <div className="relative min-w-0 flex-1">
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
          className={cn('shrink-0 gap-0', isCompact ? 'w-full' : 'w-full lg:w-auto')}
          onValueChange={(value) => {
            if (value === 'all' || value === 'editable' || value === 'upstream') {
              onOwnershipChange(value);
            }
          }}
          value={ownership}
        >
          <TabsList
            aria-label="Filter by ownership"
            className={cn(isCompact ? 'w-full' : 'w-full lg:w-auto')}
          >
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="editable">Editable</TabsTrigger>
            <TabsTrigger value="upstream">Upstream</TabsTrigger>
          </TabsList>
        </Tabs>
          </>
        ) : null}
      </div>
    </div>
  );
}
