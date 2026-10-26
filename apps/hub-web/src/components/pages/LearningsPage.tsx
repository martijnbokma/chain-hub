import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { errorMessage, learningsApi, libraryApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { selectSkillsNeedingAttention } from '@/lib/learnings';
import type { CaptureEventType } from '@/types';
import { EVENT_TYPES } from './learnings/learnings-meta';
import { NeedsAttentionCard } from './learnings/NeedsAttentionCard';
import { SkillReflectionCard } from './learnings/SkillReflectionCard';

export function LearningsPage() {
  const queryClient = useQueryClient();
  const [eventType, setEventType] = useState<CaptureEventType>('note');
  const [skill, setSkill] = useState('');
  const [summary, setSummary] = useState('');

  const reflection = useQuery({
    queryKey: queryKeys.learningsReflect,
    queryFn: () => learningsApi.getReflection()
  });

  const library = useQuery({
    queryKey: queryKeys.library,
    queryFn: () => libraryApi.getAll()
  });

  const hubSkills = useMemo(
    () => new Set((library.data ?? []).filter((asset) => asset.kind === 'skills').map((asset) => asset.name)),
    [library.data]
  );

  const needsAttention = useMemo(
    () => selectSkillsNeedingAttention(reflection.data?.skills ?? [], hubSkills),
    [hubSkills, reflection.data]
  );

  const capture = useMutation({
    mutationFn: async () => {
      return learningsApi.capture({ type: eventType, skill: skill.trim(), summary: summary.trim() });
    },
    onSuccess: () => {
      setSkill('');
      setSummary('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningsReflect });
      toast.success('Event logged');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to log event'));
    }
  });

  if (reflection.isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (reflection.isError) {
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
            <SkillReflectionCard key={skill.skill} skill={skill} inHub={hubSkills.has(skill.skill)} />
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
            <Button className="sm:row-span-2" loading={capture.isPending} type="submit">
              {capture.isPending ? 'Logging…' : 'Log event'}
            </Button>
            <Textarea
              aria-label="Event summary"
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
