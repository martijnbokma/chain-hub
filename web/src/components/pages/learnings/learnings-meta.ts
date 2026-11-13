import type { CaptureEventType, SkillReflection } from '@/types';

export const EVENT_TYPES: CaptureEventType[] = ['success', 'failure', 'correction', 'note'];

export const TREND_BADGE: Record<
  SkillReflection['trend'],
  { label: string; variant: 'success' | 'destructive' | 'default' | 'accent'; description: string }
> = {
  improving: {
    label: '↑ improving',
    variant: 'success',
    description: 'More successes than corrections and failures captured. No action needed.'
  },
  struggling: {
    label: '↓ struggling',
    variant: 'destructive',
    description: 'More corrections and failures than successes. Audit the skill to fold the field reports in.'
  },
  stable: {
    label: '→ stable',
    variant: 'default',
    description: 'Successes and corrections/failures are in balance. No action needed.'
  },
  new: {
    label: '★ new',
    variant: 'accent',
    description: 'Only one event captured so far, so there is no trend yet.'
  },
  collecting: {
    label: '• collecting',
    variant: 'default',
    description: 'Only notes captured so far. They feed the next audit as field reports.'
  }
};

export function openItemsLabel(counts: { correctionCount: number; failureCount: number; noteCount?: number }): string {
  const parts: string[] = [];
  if (counts.correctionCount > 0) {
    parts.push(`${counts.correctionCount} correction${counts.correctionCount === 1 ? '' : 's'}`);
  }
  if (counts.failureCount > 0) {
    parts.push(`${counts.failureCount} failure${counts.failureCount === 1 ? '' : 's'}`);
  }
  if (counts.noteCount) {
    parts.push(`${counts.noteCount} note${counts.noteCount === 1 ? '' : 's'}`);
  }
  return parts.join(' · ');
}
