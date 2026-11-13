import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SkillUpdateItem {
  name: string;
  currentSha?: string | null;
  latestSha?: string | null;
}

function shortSha(sha: string | null | undefined): string {
  return sha ? sha.slice(0, 7) : '…';
}

export function SkillUpdateMenu({
  items,
  isCompact,
  isUpdatingSkills,
  onUpdateSkill,
  onUpdateSkills
}: {
  items: SkillUpdateItem[];
  isCompact: boolean;
  isUpdatingSkills: boolean;
  onUpdateSkill: (name: string) => void;
  onUpdateSkills: () => void;
}) {
  const count = items.length;

  if (count === 0) {
    return (
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
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          isCompact ? (
            <Button
              aria-label={isUpdatingSkills ? 'Updating skills' : `Update ${count} skills`}
              disabled={isUpdatingSkills}
              size="sm"
              variant="secondary"
            >
              <RefreshCw className={cn('size-4', isUpdatingSkills && 'animate-spin')} />
              <span className="tabular-nums">{count}</span>
            </Button>
          ) : (
            <Button disabled={isUpdatingSkills} size="sm" variant="secondary">
              <RefreshCw className={cn('size-4', isUpdatingSkills && 'animate-spin')} />
              {isUpdatingSkills ? 'Updating…' : `Update (${count})`}
            </Button>
          )
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {count} update{count === 1 ? '' : 's'} available
          </DropdownMenuLabel>
          {items.map((item) => (
            <DropdownMenuItem key={item.name} onClick={() => onUpdateSkill(item.name)}>
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="ml-auto shrink-0 font-mono text-2xs tabular-nums text-muted-foreground">
                {shortSha(item.currentSha)} → {shortSha(item.latestSha)}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onUpdateSkills}>
          <RefreshCw />
          Update all ({count})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
