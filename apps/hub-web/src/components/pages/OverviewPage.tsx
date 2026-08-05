import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, FileText, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { Eyebrow } from '@/components/common/Eyebrow';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { overviewApi, learningsApi } from '@/lib/api';
import { EVENT_TYPE_BADGE } from '@/lib/constants';

export function OverviewPage() {
  const navigate = useNavigate();
  const overview = useQuery({
    queryKey: ['overview'],
    queryFn: () => overviewApi.get()
  });

  const learnings = useQuery({
    queryKey: ['learnings'],
    queryFn: () => learningsApi.getTimeline()
  });

  if (overview.isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (overview.isError) {
    return <EmptyState description="The overview is temporarily unavailable." title="Unable to load overview" />;
  }

  const data = overview.data;

  if (!data) {
    return <EmptyState description="The overview has no data yet." title="Overview unavailable" />;
  }

  const isHealthy = data.health.issues.length === 0;
  const assetEntries = Object.entries(data.assetCounts);

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-8">
      <header className="grid gap-3">
        <Eyebrow>Overview</Eyebrow>
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Hub status</h2>
            <Badge variant={isHealthy ? 'success' : 'warning'}>
              {isHealthy ? 'Healthy' : 'Needs attention'}
            </Badge>
          </div>
          <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
            Manage reusable guidance, validate structure, and connect editors from one place.
          </p>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Chain home</span>
          <code className="break-all font-mono text-xs text-foreground">{data.chainHome}</code>
        </p>
      </header>

      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-card sm:grid-cols-2 xl:grid-cols-4">
        {assetEntries.map(([kind, count]) => (
          <div className="grid gap-1 bg-card p-4" key={kind}>
            <p className="text-xs font-medium capitalize text-muted-foreground">{kind}</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{count}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Initialization</CardTitle>
            <Badge variant={isHealthy ? 'success' : 'warning'}>
              {isHealthy ? 'OK' : `${data.health.issues.length} issue${data.health.issues.length === 1 ? '' : 's'}`}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm leading-5 text-muted-foreground">
              Initialized:{' '}
              <span className="text-foreground">
                {data.initializedAt ? new Date(data.initializedAt).toLocaleString() : 'Not yet'}
              </span>
            </p>
            {data.health.issues.length > 0 ? (
              <ul className="grid list-inside list-disc gap-1 text-sm text-foreground">
                {data.health.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-5 text-muted-foreground">No structural issues detected.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="text-sm leading-5 text-muted-foreground">
              Indexed assets:{' '}
              <span className="font-medium tabular-nums text-foreground">{data.storage.indexedAssets}</span>
            </p>
            <code className="break-all font-mono text-xs text-muted-foreground">{data.storage.databasePath}</code>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent events</CardTitle>
            <Button className="w-fit" onClick={() => navigate('/learnings')} size="sm" variant="secondary">
              View all
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {!learnings.data || learnings.data.events.length === 0 ? (
              <p className="px-4 pb-4 text-sm leading-5 text-muted-foreground">
                No events yet. Use <code className="font-mono text-xs">chain capture</code> or Cmd+K.
              </p>
            ) : (
              <ul>
                {learnings.data.events.slice(0, 3).map((event) => {
                  const badge = EVENT_TYPE_BADGE[event.type];
                  return (
                    <li
                      className="flex items-start gap-3 border-t border-border px-4 py-3"
                      key={event.id}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        {event.type === 'success' ? (
                          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                        ) : null}
                        {event.type === 'failure' ? (
                          <XCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-red-600" />
                        ) : null}
                        {event.type === 'correction' ? (
                          <Zap aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                        ) : null}
                        {event.type === 'note' ? (
                          <FileText aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{event.skill}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.summary}</p>
                        </div>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active skills</CardTitle>
            <Button className="w-fit" onClick={() => navigate('/learnings')} size="sm" variant="secondary">
              Reflect
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {!learnings.data || learnings.data.events.length === 0 ? (
              <p className="px-4 pb-4 text-sm leading-5 text-muted-foreground">No skills tracked yet.</p>
            ) : (
              <ul>
                {[...new Set(learnings.data.events.map((event) => event.skill))].slice(0, 5).map((skill) => {
                  const skillEvents = learnings.data!.events.filter((event) => event.skill === skill);
                  const successCount = skillEvents.filter((event) => event.type === 'success').length;
                  const failureCount = skillEvents.filter((event) => event.type === 'failure').length;
                  const correctionCount = skillEvents.filter((event) => event.type === 'correction').length;

                  return (
                    <li
                      className="flex items-center justify-between gap-3 border-t border-border px-4 py-3"
                      key={skill}
                    >
                      <span className="truncate text-sm text-foreground">{skill}</span>
                      <div className="flex shrink-0 gap-1.5">
                        {successCount > 0 ? (
                          <Badge
                            aria-label={`${successCount} success${successCount === 1 ? '' : 'es'}`}
                            className="gap-1"
                            variant="success"
                          >
                            <CheckCircle2 aria-hidden="true" className="size-3" />
                            {successCount}
                          </Badge>
                        ) : null}
                        {correctionCount > 0 ? (
                          <Badge
                            aria-label={`${correctionCount} correction${correctionCount === 1 ? '' : 's'}`}
                            className="gap-1"
                            variant="warning"
                          >
                            <Zap aria-hidden="true" className="size-3" />
                            {correctionCount}
                          </Badge>
                        ) : null}
                        {failureCount > 0 ? (
                          <Badge
                            aria-label={`${failureCount} failure${failureCount === 1 ? '' : 's'}`}
                            className="gap-1"
                            variant="destructive"
                          >
                            <XCircle aria-hidden="true" className="size-3" />
                            {failureCount}
                          </Badge>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
