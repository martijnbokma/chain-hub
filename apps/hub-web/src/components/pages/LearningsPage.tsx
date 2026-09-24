import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { learningsApi, libraryApi } from '@/lib/api';
import { librarySkillLink, selectSkillsNeedingAttention, type SkillNeedingAttention } from '@/lib/learnings';
import { cn } from '@/lib/utils';
import type { CaptureEventType, SkillReflection } from '@/types';

const EVENT_TYPES: CaptureEventType[] = ['success', 'failure', 'correction', 'note'];

const TREND_BADGE: Record<SkillReflection['trend'], { label: string; variant: 'success' | 'destructive' | 'default' | 'accent' }> = {
  improving: { label: '↑ improving', variant: 'success' },
  struggling: { label: '↓ struggling', variant: 'destructive' },
  stable: { label: '→ stable', variant: 'default' },
  new: { label: '★ new', variant: 'accent' }
};

function SkillReflectionCard({ skill }: { skill: SkillReflection }) {
  const trend = TREND_BADGE[skill.trend];

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
        <Badge variant={trend.variant}>{trend.label}</Badge>
      </CardHeader>
      {skill.recentEvents.length > 0 ? (
        <CardContent>
          <ul className="grid gap-1.5">
            {skill.recentEvents.map((event) => (
              <li className="text-xs leading-5 text-muted-foreground" key={event.id}>
                <span className="font-mono text-2xs uppercase text-foreground">[{event.type}]</span>{' '}
                {event.summary}
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}

function issueCountLabel(item: SkillNeedingAttention): string {
  const parts: string[] = [];
  if (item.correctionCount > 0) {
    parts.push(`${item.correctionCount} correction${item.correctionCount === 1 ? '' : 's'}`);
  }
  if (item.failureCount > 0) {
    parts.push(`${item.failureCount} failure${item.failureCount === 1 ? '' : 's'}`);
  }
  return parts.join(' · ');
}

function NeedsAttentionCard({ items }: { items: SkillNeedingAttention[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>Needs attention</CardTitle>
          <p className="text-xs text-muted-foreground">
            Audit includes these field reports and turns open ones into findings you can apply.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {items.map((item) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              key={item.skill}
            >
              <div className="grid min-w-0 gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{item.skill}</span>
                  <Badge variant="warning">{issueCountLabel(item)}</Badge>
                </div>
                {item.latestIssue ? (
                  <p className="text-xs leading-5 text-pretty text-muted-foreground">{item.latestIssue.summary}</p>
                ) : null}
              </div>
              {item.inHub ? (
                <Link
                  className={cn(buttonVariants({ size: 'sm', variant: 'secondary' }), 'shrink-0')}
                  to={librarySkillLink(item.skill)}
                >
                  Audit skill
                </Link>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">Not in your hub</span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function LearningsPage() {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState<CaptureEventType>('note');
  const [skill, setSkill] = useState('');
  const [summary, setSummary] = useState('');

  const reflection = useQuery({
    queryKey: ['learnings-reflect'],
    queryFn: () => learningsApi.getReflection()
  });

  const timeline = useQuery({
    queryKey: ['learnings-timeline'],
    queryFn: () => learningsApi.getTimeline()
  });

  const library = useQuery({
    queryKey: ['library'],
    queryFn: () => libraryApi.getAll()
  });

  const needsAttention = useMemo(() => {
    const hubSkills = new Set(
      (library.data ?? []).filter((asset) => asset.kind === 'skills').map((asset) => asset.name)
    );
    return selectSkillsNeedingAttention(reflection.data?.skills ?? [], hubSkills);
  }, [library.data, reflection.data]);

  const capture = useMutation({
    mutationFn: async () => {
      return learningsApi.capture({ type: eventType, skill: skill.trim(), summary: summary.trim() });
    },
    onSuccess: () => {
      setSkill('');
      setSummary('');
      void queryClient.invalidateQueries({ queryKey: ['learnings-reflect'] });
      void queryClient.invalidateQueries({ queryKey: ['learnings-timeline'] });
      toast.success('Event logged');
    },
    onError: () => {
      toast.error('Unable to log event');
    }
  });

  if (reflection.isLoading || timeline.isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (reflection.isError || timeline.isError) {
    return <EmptyState description="Learnings are temporarily unavailable." title="Unable to load learnings" />;
  }

  const report = reflection.data;
  const totalEvents = report?.totalEvents ?? 0;

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-8">
      <header className="grid gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Skill reflections</h2>
        <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
          Per-skill trend from captured events. Events populate automatically once the seeded{' '}
          <code className="font-mono text-xs text-muted-foreground">chain-hub-learnings</code> rule reaches a
          connected editor, or log one manually below.
        </p>
      </header>

      {needsAttention.length > 0 ? <NeedsAttentionCard items={needsAttention} /> : null}

      {totalEvents === 0 ? (
        <EmptyState
          description="No events captured yet. Log one manually below, or run chain capture --event <type> --skill <slug> --summary '<text>' from a terminal."
          title="No learnings yet"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {report!.skills.map((skill) => (
            <SkillReflectionCard key={skill.skill} skill={skill} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Log an event</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-start"
            onSubmit={(event) => {
              event.preventDefault();
              if (!skill.trim() || !summary.trim()) {
                return;
              }
              capture.mutate();
            }}
          >
            <Select
              aria-label="Event type"
              onChange={(event) => setEventType(event.target.value as CaptureEventType)}
              value={eventType}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Input
              aria-label="Skill slug"
              onChange={(event) => setSkill(event.target.value)}
              placeholder="skill slug"
              value={skill}
            />
            <Button className="sm:row-span-2" disabled={capture.isPending} type="submit">
              {capture.isPending ? 'Logging…' : 'Log event'}
            </Button>
            <Textarea
              className="sm:col-span-2"
              onChange={(event) => setSummary(event.target.value)}
              placeholder="One-line summary of what happened"
              value={summary}
            />
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
