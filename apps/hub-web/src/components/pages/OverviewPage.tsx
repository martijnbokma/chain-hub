import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Database, Zap, CheckCircle2, XCircle, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { Eyebrow } from '@/components/common/Eyebrow';
import { overviewApi, learningsApi } from '@/lib/api';
import { EVENT_TYPE_BADGE } from '@/lib/constants';
import type { Overview, LearningsTimeline } from '@/types';

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
    return <EmptyState description="The overview is loading." title="Loading overview" />;
  }

  if (overview.isError) {
    return <EmptyState description="The overview is temporarily unavailable." title="Unable to load overview" />;
  }

  const data = overview.data;

  if (!data) {
    return <EmptyState description="The overview has no data yet." title="Overview unavailable" />;
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div>
          <Eyebrow>Overview</Eyebrow>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            One calm surface for a local-first AI workspace.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Chain Hub v2 reduces the product to its core: initialize a local hub, manage reusable guidance,
            validate structure, and connect editors from one place.
          </p>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <Badge variant={data.health.issues.length === 0 ? 'success' : 'warning'}>
              {data.health.issues.length === 0 ? 'Healthy' : 'Needs attention'}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="break-all text-sm text-muted-foreground">{data.chainHome}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(data.assetCounts).map(([kind, count]) => (
          <Card key={kind}>
            <CardHeader className="pb-2">
              <Eyebrow>{kind}</Eyebrow>
            </CardHeader>
            <CardContent>
              <strong className="font-display text-4xl tracking-tight">{count}</strong>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <Eyebrow>Health</Eyebrow>
              <CardTitle>Initialization</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Initialized: {data.initializedAt ? new Date(data.initializedAt).toLocaleString() : 'No'}
            </p>
            {data.health.issues.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                {data.health.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No structural issues detected.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="size-4 text-primary" />
              <div>
                <Eyebrow>Storage</Eyebrow>
                <CardTitle>SQLite index</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="break-all text-sm text-muted-foreground">{data.storage.databasePath}</p>
            <p className="text-sm text-foreground">Indexed assets: {data.storage.indexedAssets}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Zap className="size-4 text-primary" />
                <div>
                  <Eyebrow>Learnings</Eyebrow>
                  <CardTitle>Recent events</CardTitle>
                </div>
              </div>
              <Button onClick={() => navigate('/learnings')} variant="secondary">
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            {!learnings.data || learnings.data.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events captured yet. Use <code className="rounded bg-muted px-1 py-0.5 text-xs">chain capture</code> or Cmd+K.</p>
            ) : (
              learnings.data.events.slice(0, 3).map((event) => {
                const badge = EVENT_TYPE_BADGE[event.type];
                return (
                  <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-2" key={event.id}>
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      {event.type === 'success' && <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-500" />}
                      {event.type === 'failure' && <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-500" />}
                      {event.type === 'correction' && <Zap className="mt-0.5 size-3.5 shrink-0 text-yellow-500" />}
                      {event.type === 'note' && <FileText className="mt-0.5 size-3.5 shrink-0 text-primary" />}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{event.skill}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.summary}</p>
                      </div>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Eyebrow>Skill signals</Eyebrow>
                <CardTitle>Active skills</CardTitle>
              </div>
              <Button onClick={() => navigate('/learnings')} variant="secondary">
                Reflect
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            {!learnings.data || learnings.data.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills tracked yet.</p>
            ) : (
              [...new Set(learnings.data.events.map((e) => e.skill))].slice(0, 5).map((skill) => {
                const skillEvents = learnings.data!.events.filter((e) => e.skill === skill);
                const successCount = skillEvents.filter((e) => e.type === 'success').length;
                const failureCount = skillEvents.filter((e) => e.type === 'failure').length;
                const correctionCount = skillEvents.filter((e) => e.type === 'correction').length;
                return (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2" key={skill}>
                    <span className="truncate text-sm text-foreground">{skill}</span>
                    <div className="flex shrink-0 gap-1.5">
                      {successCount > 0 && <Badge variant="success">{successCount}</Badge>}
                      {correctionCount > 0 && <Badge variant="warning">{correctionCount}</Badge>}
                      {failureCount > 0 && <Badge variant="destructive">{failureCount}</Badge>}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}