import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { EVENT_TYPE_BADGE, TREND_CONFIG } from '@/lib/constants';
import type { ReflectionReport } from '@/types';

interface ReflectTabProps {
  reflection: ReflectionReport | undefined;
  isLoading: boolean;
}

export function ReflectTab({ reflection, isLoading }: ReflectTabProps) {
  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading reflection" className="grid gap-3">
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!reflection || reflection.skills.length === 0) {
    return (
      <EmptyState
        description="Capture some events first and the reflect view will group them by skill."
        title="No reflection data yet"
      />
    );
  }

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Generated {new Date(reflection.generatedAt).toLocaleString()} ·{' '}
        {reflection.totalEvents} events · {reflection.totalSkills} skills
      </p>
      <div className="grid gap-3">
        {reflection.skills.map((skillData) => {
          const trend = TREND_CONFIG[skillData.trend];
          return (
            <Card key={skillData.skill}>
              <CardHeader className="pb-3">
                <div className="grid min-w-0 gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{skillData.skill}</CardTitle>
                    <Badge variant={trend.variant}>
                      <span aria-hidden="true">{trend.icon}</span> {skillData.trend}
                    </Badge>
                  </div>
                  <CardDescription>
                    {skillData.totalEvents} events · first{' '}
                    {new Date(skillData.firstSeen).toLocaleDateString()} · last{' '}
                    {new Date(skillData.lastSeen).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skillData.successCount > 0 ? (
                    <Badge variant="success">{skillData.successCount} success</Badge>
                  ) : null}
                  {skillData.failureCount > 0 ? (
                    <Badge variant="destructive">{skillData.failureCount} failure</Badge>
                  ) : null}
                  {skillData.correctionCount > 0 ? (
                    <Badge variant="warning">{skillData.correctionCount} correction</Badge>
                  ) : null}
                  {skillData.noteCount > 0 ? (
                    <Badge variant="accent">{skillData.noteCount} note</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <p className="px-4 pb-2 text-xs font-medium text-muted-foreground">Recent events</p>
                <ul>
                  {skillData.recentEvents.map((event) => (
                    <li className="flex items-start gap-3 border-t border-border px-4 py-3" key={event.id}>
                      <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">
                        {new Date(event.capturedAt).toLocaleDateString()}
                      </span>
                      <div className="min-w-0">
                        <Badge className="mb-1" variant={EVENT_TYPE_BADGE[event.type].variant}>
                          {event.type}
                        </Badge>
                        <p className="text-sm leading-5 text-muted-foreground">{event.summary}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
