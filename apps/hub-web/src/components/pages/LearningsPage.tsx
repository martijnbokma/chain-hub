import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Eyebrow } from '@/components/common/Eyebrow';
import { learningsApi } from '@/lib/api';
import { EVENT_TYPE_BADGE, TREND_CONFIG } from '@/lib/constants';
import type { CaptureEventType, CaptureEvent } from '@/types';

export function LearningsPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<CaptureEventType | '__all__'>('__all__');
  const [filterSkill, setFilterSkill] = useState('');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureType, setCaptureType] = useState<CaptureEventType>('note');
  const [captureSkill, setCaptureSkill] = useState('');
  const [captureSummary, setCaptureSummary] = useState('');

  const timeline = useQuery({
    queryKey: ['learnings'],
    queryFn: () => learningsApi.getTimeline()
  });

  const reflect = useQuery({
    queryKey: ['learnings-reflect'],
    queryFn: () => learningsApi.getReflection()
  });

  const captureEvent = useMutation({
    mutationFn: async () => {
      const response = await learningsApi.captureEvent({
        type: captureType,
        skill: captureSkill,
        summary: captureSummary
      });
      if (!response.ok) throw new Error('Capture failed');
      return response.json() as Promise<CaptureEvent>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['learnings'] });
      void queryClient.invalidateQueries({ queryKey: ['learnings-reflect'] });
      setCaptureOpen(false);
      setCaptureSkill('');
      setCaptureSummary('');
      setCaptureType('note');
      toast.success('Event captured');
    },
    onError: () => toast.error('Unable to capture event')
  });

  const events = timeline.data?.events ?? [];

  const filtered = events.filter((event) => {
    const matchType = filterType === '__all__' || event.type === filterType;
    const matchSkill =
      !filterSkill.trim() || event.skill.toLowerCase().includes(filterSkill.toLowerCase());
    return matchType && matchSkill;
  });

  const skillSet = [...new Set(events.map((event) => event.skill))].sort();

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <Eyebrow>Learnings</Eyebrow>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Capture and reflect</h2>
          <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
            Log corrections and successes, then review signals by skill.
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              <span className="font-medium tabular-nums text-foreground">
                {timeline.data?.totalEvents ?? 0}
              </span>{' '}
              events
            </span>
            <span>
              <span className="font-medium tabular-nums text-foreground">{skillSet.length}</span> skills
            </span>
            <Badge variant={timeline.data?.status === 'active' ? 'success' : 'warning'}>
              {timeline.data?.status ?? 'empty'}
            </Badge>
          </p>
        </div>
        <Button className="w-fit shrink-0" onClick={() => setCaptureOpen(true)}>
          <Zap className="size-4" />
          Capture event
        </Button>
      </header>

      {(timeline.data?.skippedLines ?? 0) > 0 ? (
        <Alert variant="warning">
          <AlertIcon>
            <XCircle />
          </AlertIcon>
          <AlertDescription>
            {timeline.data!.skippedLines} malformed{' '}
            {timeline.data!.skippedLines === 1 ? 'line' : 'lines'} in the learnings log were skipped.
            The file at{' '}
            <code className="font-mono text-xs text-foreground">{timeline.data!.logPath}</code> may
            need manual repair.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="reflect">Reflect</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-0 grid gap-4" value="timeline">
          <div className="flex flex-wrap gap-3">
            <Select
              aria-label="Filter by event type"
              className="w-fit min-w-40"
              onChange={(event) => setFilterType(event.target.value as CaptureEventType | '__all__')}
              value={filterType}
            >
              <option value="__all__">All types</option>
              <option value="success">success</option>
              <option value="failure">failure</option>
              <option value="correction">correction</option>
              <option value="note">note</option>
            </Select>
            <Input
              aria-label="Filter by skill"
              className="max-w-xs"
              onChange={(event) => setFilterSkill(event.target.value)}
              placeholder="Filter by skill…"
              value={filterSkill}
            />
          </div>

          {timeline.isLoading ? (
            <div
              aria-busy="true"
              aria-label="Loading timeline"
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="grid gap-2 border-b border-border p-4 last:border-b-0" key={index}>
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              description={
                events.length === 0
                  ? 'No events yet. Use Capture event or Cmd+K.'
                  : 'No events match the current filter.'
              }
              title={events.length === 0 ? 'Timeline is empty' : 'No matches'}
            />
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              {filtered.map((event) => {
                const badge = EVENT_TYPE_BADGE[event.type];
                return (
                  <li className="grid gap-2 border-b border-border p-4 last:border-b-0" key={event.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {event.type === 'success' ? (
                          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
                        ) : null}
                        {event.type === 'failure' ? (
                          <XCircle aria-hidden="true" className="size-4 shrink-0 text-red-600" />
                        ) : null}
                        {event.type === 'correction' ? (
                          <Zap aria-hidden="true" className="size-4 shrink-0 text-amber-600" />
                        ) : null}
                        {event.type === 'note' ? (
                          <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                        ) : null}
                        <span className="truncate text-sm font-medium text-foreground">{event.skill}</span>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.capturedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm leading-5 text-muted-foreground">{event.summary}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent className="mt-0 grid gap-4" value="reflect">
          {reflect.isLoading ? (
            <div aria-busy="true" aria-label="Loading reflection" className="grid gap-3">
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !reflect.data || reflect.data.skills.length === 0 ? (
            <EmptyState
              description="Capture some events first and the reflect view will group them by skill."
              title="No reflection data yet"
            />
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Generated {new Date(reflect.data.generatedAt).toLocaleString()} ·{' '}
                {reflect.data.totalEvents} events · {reflect.data.totalSkills} skills
              </p>
              <div className="grid gap-3">
                {reflect.data.skills.map((skillData) => {
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
                            <li
                              className="flex items-start gap-3 border-t border-border px-4 py-3"
                              key={event.id}
                            >
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
          )}
        </TabsContent>
      </Tabs>

      <Dialog onOpenChange={setCaptureOpen} open={captureOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture event</DialogTitle>
            <DialogDescription>Log a learning, correction, or note to the hub timeline.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Type</span>
              <Select
                onChange={(event) => setCaptureType(event.target.value as CaptureEventType)}
                value={captureType}
              >
                <option value="note">note</option>
                <option value="success">success</option>
                <option value="failure">failure</option>
                <option value="correction">correction</option>
              </Select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Skill / topic</span>
              <Input
                onChange={(event) => setCaptureSkill(event.target.value)}
                placeholder="e.g. react-patterns"
                value={captureSkill}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Summary</span>
              <Textarea
                onChange={(event) => setCaptureSummary(event.target.value)}
                placeholder="What happened or what did you learn?"
                rows={4}
                value={captureSummary}
              />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setCaptureOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={
                captureEvent.isPending ||
                captureSkill.trim().length === 0 ||
                captureSummary.trim().length === 0
              }
              onClick={() => captureEvent.mutate()}
            >
              {captureEvent.isPending ? 'Capturing…' : 'Capture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
