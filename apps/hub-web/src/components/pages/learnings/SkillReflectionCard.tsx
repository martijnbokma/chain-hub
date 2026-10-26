import { Link } from 'react-router-dom';

import { badgeVariants } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { librarySkillLink } from '@/lib/learnings';
import { cn } from '@/lib/utils';
import type { SkillReflection } from '@/types';
import { openItemsLabel, TREND_BADGE } from './learnings-meta';
import { useResolveSkill } from './use-resolve-skill';

export function SkillReflectionCard({ skill, inHub }: { skill: SkillReflection; inHub: boolean }) {
  const resolve = useResolveSkill();
  const trend = TREND_BADGE[skill.trend];
  const pendingCount = skill.openCorrectionCount + skill.openFailureCount + skill.openNoteCount;
  const showAction = pendingCount > 0;
  const actionText = `${openItemsLabel({
    correctionCount: skill.openCorrectionCount,
    failureCount: skill.openFailureCount,
    noteCount: skill.openNoteCount
  })} open — the next audit folds them into the skill, or mark them addressed once handled.`;

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>{skill.skill}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {skill.totalEvents} event{skill.totalEvents === 1 ? '' : 's'} · {skill.successCount} success ·{' '}
            {skill.failureCount} failure · {skill.correctionCount} correction · {skill.noteCount} note
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className={cn(badgeVariants({ variant: trend.variant }), 'cursor-help')} type="button">
              {trend.label}
            </TooltipTrigger>
            <TooltipContent>{trend.description}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      {skill.recentEvents.length > 0 || showAction ? (
        <CardContent className="grid gap-3">
          {skill.recentEvents.length > 0 ? (
            <ul className="grid gap-1.5">
              {skill.recentEvents.map((event) => (
                <li className="text-xs leading-5 text-muted-foreground" key={event.id}>
                  <span className="font-mono text-2xs uppercase text-foreground">[{event.type}]</span>{' '}
                  {event.summary}
                </li>
              ))}
            </ul>
          ) : null}
          {showAction ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <p className="text-xs leading-5 text-pretty text-muted-foreground">{actionText}</p>
              <div className="flex shrink-0 items-center gap-2">
                {inHub ? (
                  <Link
                    className={buttonVariants({ size: 'sm', variant: 'secondary' })}
                    to={librarySkillLink(skill.skill, { audit: true })}
                  >
                    Audit skill
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">Not in your hub</span>
                )}
                <Button
                  disabled={resolve.isPending}
                  loading={resolve.isPending}
                  onClick={() => resolve.mutate(skill.skill)}
                  size="sm"
                  variant="ghost"
                >
                  Mark addressed
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
