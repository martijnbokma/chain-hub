import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
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
import { Eyebrow } from '@/components/common/Eyebrow';
import { learningsApi } from '@/lib/api';
import type { CaptureEventType, CaptureEvent } from '@/types';
import { ReflectTab } from './learnings/ReflectTab';
import { TimelineTab } from './learnings/TimelineTab';

export function LearningsPage() {
  const queryClient = useQueryClient();
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

      <datalist id="learnings-skill-options">
        {skillSet.map((skill) => (
          <option key={skill} value={skill} />
        ))}
      </datalist>

      {(timeline.data?.skippedLines ?? 0) > 0 ? (
        <Alert variant="warning">
          <AlertIcon>
            <XCircle />
          </AlertIcon>
          <AlertDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {timeline.data!.skippedLines} malformed{' '}
              {timeline.data!.skippedLines === 1 ? 'line' : 'lines'} in the learnings log were skipped.
              The file at{' '}
              <code className="font-mono text-xs text-foreground">{timeline.data!.logPath}</code> may
              need manual repair.
            </span>
            <Button
              onClick={() => {
                void navigator.clipboard.writeText(timeline.data!.logPath);
                toast.success('Path copied');
              }}
              size="sm"
              variant="secondary"
            >
              Copy path
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="reflect">Reflect</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-0 grid gap-4" value="timeline">
          <TimelineTab events={events} isLoading={timeline.isLoading} />
        </TabsContent>

        <TabsContent className="mt-0 grid gap-4" value="reflect">
          <ReflectTab isLoading={reflect.isLoading} reflection={reflect.data} />
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
                list="learnings-skill-options"
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
