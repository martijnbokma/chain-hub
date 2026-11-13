import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { openReportCount } from '@/lib/learnings';
import { cn } from '@/lib/utils';
import type { SkillReflection } from '@/types';

interface SkillCollectionListProps {
  open: SkillReflection[];
  quiet: SkillReflection[];
  hubSkills: ReadonlySet<string>;
  activeSkill: string;
  onSelect: (skill: string) => void;
}

/**
 * Scrollable master list of learning collections: open reports first in a
 * labelled group, quiet collections collapsed behind a toggle so long
 * histories do not stretch the page.
 */
export function SkillCollectionList({ open, quiet, hubSkills, activeSkill, onSelect }: SkillCollectionListProps) {
  const [showQuiet, setShowQuiet] = useState(false);
  const quietVisible = showQuiet || open.length === 0;

  const renderRow = (entry: SkillReflection) => {
    const reports = openReportCount(entry);
    const isActive = entry.skill === activeSkill;
    const inHub = hubSkills.has(entry.skill);
    return (
      <li key={entry.skill}>
        <button
          aria-current={isActive || undefined}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            isActive
              ? 'bg-muted font-medium text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
          onClick={() => onSelect(entry.skill)}
          type="button"
        >
          <span className="min-w-0 flex-1 truncate">{entry.skill}</span>
          {!inHub ? <Badge variant="default">no skill</Badge> : null}
          {reports > 0 ? <Badge variant="warning">{reports} open</Badge> : null}
        </button>
      </li>
    );
  };

  return (
    <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-card">
      <ul className="divide-y divide-border">
        {open.length > 0 ? (
          <li className="sticky top-0 z-10 bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
            Open reports · {open.length}
          </li>
        ) : null}
        {open.map(renderRow)}
        {quiet.length > 0 ? (
          <li>
            <button
              aria-expanded={quietVisible}
              className={cn(
                'flex w-full items-center justify-between gap-2 bg-card px-3 py-2 text-left text-xs font-medium transition-colors',
                'text-muted-foreground hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                quietVisible ? 'sticky top-0 z-10' : ''
              )}
              onClick={() => setShowQuiet((value) => !value)}
              type="button"
            >
              Quiet · {quiet.length}
              <ChevronDown
                aria-hidden="true"
                className={cn('size-3.5 transition-transform', quietVisible ? 'rotate-180' : '')}
              />
            </button>
          </li>
        ) : null}
        {quietVisible ? quiet.map(renderRow) : null}
      </ul>
    </div>
  );
}
