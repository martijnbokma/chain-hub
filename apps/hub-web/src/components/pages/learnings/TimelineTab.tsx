import { useState } from 'react';
import { Zap, CheckCircle2, XCircle, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { EVENT_TYPE_BADGE } from '@/lib/constants';
import type { CaptureEvent, CaptureEventType } from '@/types';

interface TimelineTabProps {
  events: CaptureEvent[];
  isLoading: boolean;
}

export function TimelineTab({ events, isLoading }: TimelineTabProps) {
  const [filterType, setFilterType] = useState<CaptureEventType | '__all__'>('__all__');
  const [filterSkill, setFilterSkill] = useState('');

  const filtered = events.filter((event) => {
    const matchType = filterType === '__all__' || event.type === filterType;
    const matchSkill =
      !filterSkill.trim() || event.skill.toLowerCase().includes(filterSkill.toLowerCase());
    return matchType && matchSkill;
  });

  return (
    <>
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
          list="learnings-skill-options"
          onChange={(event) => setFilterSkill(event.target.value)}
          placeholder="Filter by skill…"
          value={filterSkill}
        />
      </div>

      {isLoading ? (
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
                      <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" />
                    ) : null}
                    {event.type === 'failure' ? (
                      <XCircle aria-hidden="true" className="size-4 shrink-0 text-destructive" />
                    ) : null}
                    {event.type === 'correction' ? (
                      <Zap aria-hidden="true" className="size-4 shrink-0 text-warning" />
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
    </>
  );
}
