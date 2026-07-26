import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/common/EmptyState';
import { Eyebrow } from '@/components/common/Eyebrow';
import { learningsApi } from '@/lib/api';
import { EVENT_TYPE_BADGE, TREND_CONFIG } from '@/lib/constants';
import type { CaptureEventType, CaptureEvent, LearningsTimeline, ReflectionReport, SkillReflection } from '@/types';

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
      const response = await fetch('/api/learnings/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: captureType, skill: captureSkill, summary: captureSummary })
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
    onError: () => toast.error('Capture failed')
  });

  const events = timeline.data?.events ?? [];

  const filtered = events.filter((e) => {
    const matchType = filterType === '__all__' || e.type === filterType;
    const matchSkill = !filterSkill.trim() || e.skill.toLowerCase().includes(filterSkill.toLowerCase());
    return matchType && matchSkill;
  });

  const skillSet = [...new Set(events.map((e) => e.skill))].sort();

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow>Learnings</Eyebrow>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Every correction becomes a signal.
          </h2>
        </div>
        <Button onClick={() => setCaptureOpen(true)}>
          <Zap className="size-4" />
          Capture event
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><Eyebrow>Total</Eyebrow></CardHeader>
          <CardContent>
            <strong className="font-display text-4xl tracking-tight">{timeline.data?.totalEvents ?? 0}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><Eyebrow>Skills tracked</Eyebrow></CardHeader>
          <CardContent>
            <strong className="font-display text-4xl tracking-tight">{skillSet.length}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><Eyebrow>Status</Eyebrow></CardHeader>
          <CardContent>
            <Badge variant={timeline.data?.status === 'active' ? 'success' : 'warning'}>
              {timeline.data?.status ?? 'empty'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {(timeline.data?.skippedLines ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <XCircle className="size-4 shrink-0" />
          <span>
            {timeline.data!.skippedLines} malformed {timeline.data!.skippedLines === 1 ? 'line' : 'lines'} in the learnings log were skipped. The file at <code className="rounded bg-black/20 px-1">{timeline.data!.logPath}</code> may need manual repair.
          </span>
        </div>
      )}

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="reflect">Reflect</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4 grid gap-4">
          <div className="flex flex-wrap gap-3">
            <Select
              onChange={(e) => setFilterType(e.target.value as CaptureEventType | '__all__')}
              value={filterType}
            >
              <option value="__all__">All types</option>
              <option value="success">success</option>
              <option value="failure">failure</option>
              <option value="correction">correction</option>
              <option value="note">note</option>
            </Select>
            <Input
              className="max-w-xs"
              onChange={(e) => setFilterSkill(e.target.value)}
              placeholder="Filter by skill…"
              value={filterSkill}
            />
          </div>

          {timeline.isLoading ? (
            <EmptyState description="Loading timeline…" title="Loading" />
          ) : filtered.length === 0 ? (
            <EmptyState
              description={events.length === 0 ? 'No events yet. Use Capture event or Cmd+K → Capture event.' : 'No events match the current filter.'}
              title={events.length === 0 ? 'Timeline is empty' : 'No matches'}
            />
          ) : (
            <div className="grid gap-3">
              {filtered.map((event) => {
                const badge = EVENT_TYPE_BADGE[event.type];
                return (
                  <Card key={event.id}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {event.type === 'success' && <CheckCircle2 className="size-4 shrink-0 text-green-500" />}
                          {event.type === 'failure' && <XCircle className="size-4 shrink-0 text-red-500" />}
                          {event.type === 'correction' && <Zap className="size-4 shrink-0 text-yellow-500" />}
                          {event.type === 'note' && <FileText className="size-4 shrink-0 text-primary" />}
                          <span className="font-medium text-foreground">{event.skill}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.capturedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{event.summary}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reflect" className="mt-4 grid gap-4">
          {reflect.isLoading ? (
            <EmptyState description="Generating reflection…" title="Loading" />
          ) : !reflect.data || reflect.data.skills.length === 0 ? (
            <EmptyState
              description="Capture some events first and the reflect view will group them by skill."
              title="No reflection data yet"
            />
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Generated {new Date(reflect.data.generatedAt).toLocaleString()} · {reflect.data.totalEvents} events · {reflect.data.totalSkills} skills
              </p>
              <div className="grid gap-4">
                {reflect.data.skills.map((skillData) => {
                  const trend = TREND_CONFIG[skillData.trend];
                  return (
                    <Card key={skillData.skill}>
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <span>{skillData.skill}</span>
                            </CardTitle>
                            <CardDescription>
                              {skillData.totalEvents} events · first seen {new Date(skillData.firstSeen).toLocaleDateString()} · last seen {new Date(skillData.lastSeen).toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <Badge variant={trend.variant}>
                            {trend.icon} {skillData.trend}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {skillData.successCount > 0 && <Badge variant="success">{skillData.successCount} success</Badge>}
                          {skillData.failureCount > 0 && <Badge variant="destructive">{skillData.failureCount} failure</Badge>}
                          {skillData.correctionCount > 0 && <Badge variant="warning">{skillData.correctionCount} correction</Badge>}
                          {skillData.noteCount > 0 && <Badge variant="accent">{skillData.noteCount} note</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-2">
                        <Eyebrow>Recent events</Eyebrow>
                        {skillData.recentEvents.map((e) => (
                          <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-2" key={e.id}>
                            <span className="mt-0.5 text-xs text-muted-foreground">{new Date(e.capturedAt).toLocaleDateString()}</span>
                            <div className="min-w-0">
                              <Badge className="mb-1" variant={EVENT_TYPE_BADGE[e.type].variant}>{e.type}</Badge>
                              <p className="text-sm text-muted-foreground">{e.summary}</p>
                            </div>
                          </div>
                        ))}
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
              <Select onChange={(e) => setCaptureType(e.target.value as CaptureEventType)} value={captureType}>
                <option value="note">note</option>
                <option value="success">success</option>
                <option value="failure">failure</option>
                <option value="correction">correction</option>
              </Select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Skill / topic</span>
              <Input
                onChange={(e) => setCaptureSkill(e.target.value)}
                placeholder="e.g. react-patterns"
                value={captureSkill}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Summary</span>
              <Textarea
                onChange={(e) => setCaptureSummary(e.target.value)}
                placeholder="What happened or what did you learn?"
                rows={4}
                value={captureSummary}
              />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setCaptureOpen(false)} variant="secondary">Cancel</Button>
            <Button
              disabled={captureEvent.isPending || captureSkill.trim().length === 0 || captureSummary.trim().length === 0}
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