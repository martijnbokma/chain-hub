import type { CaptureEvent, SkillReflection } from '@/types';

export type SkillNeedingAttention = {
  skill: string;
  correctionCount: number;
  failureCount: number;
  /** Most recent unaddressed correction or failure among the skill's recent events, if any. */
  latestIssue: CaptureEvent | null;
  /** Whether the skill exists in the hub, so it can be opened and audited in Library. */
  inHub: boolean;
};

/** Skills with unaddressed corrections or failures, most issues first. */
export function selectSkillsNeedingAttention(
  skills: SkillReflection[],
  hubSkillNames: ReadonlySet<string>
): SkillNeedingAttention[] {
  const isOpenIssue = (skill: SkillReflection, event: CaptureEvent) =>
    (event.type === 'correction' || event.type === 'failure') &&
    (!skill.resolvedAt || event.capturedAt > skill.resolvedAt);

  return skills
    .filter((skill) => skill.openCorrectionCount + skill.openFailureCount > 0)
    .map((skill) => ({
      skill: skill.skill,
      correctionCount: skill.openCorrectionCount,
      failureCount: skill.openFailureCount,
      latestIssue: skill.recentEvents.find((event) => isOpenIssue(skill, event)) ?? null,
      inHub: hubSkillNames.has(skill.skill)
    }))
    .sort(
      (a, b) =>
        b.correctionCount + b.failureCount - (a.correctionCount + a.failureCount) || a.skill.localeCompare(b.skill)
    );
}

/** Deep-link into Library, optionally straight into the audit flow. */
export function librarySkillLink(skill: string, options?: { audit?: boolean }): string {
  const params = new URLSearchParams({ kind: 'skills', asset: skill });
  if (options?.audit) {
    params.set('audit', '1');
  }
  return `/library?${params.toString()}`;
}

/** Open field reports on a reflection entry. */
export function openReportCount(skill: SkillReflection): number {
  return skill.openCorrectionCount + skill.openFailureCount + skill.openNoteCount;
}

/** Split reflections into actionable collections (most open reports first) and quiet ones. */
export function groupReflections(skills: SkillReflection[]): { open: SkillReflection[]; quiet: SkillReflection[] } {
  const open = skills
    .filter((skill) => openReportCount(skill) > 0)
    .sort((a, b) => openReportCount(b) - openReportCount(a) || b.lastSeen.localeCompare(a.lastSeen));
  return { open, quiet: skills.filter((skill) => openReportCount(skill) === 0) };
}

/** Field-report types that carry something a skill should learn; mirrors the backend fold filter. */
export const OPEN_REPORT_TYPES: ReadonlySet<CaptureEvent['type']> = new Set(['correction', 'failure', 'note']);

/** A skill's unaddressed field reports out of the learnings timeline, newest first. */
export function selectOpenReports(events: CaptureEvent[], skill: SkillReflection): CaptureEvent[] {
  return events.filter(
    (event) =>
      event.skill === skill.skill &&
      OPEN_REPORT_TYPES.has(event.type) &&
      (!skill.resolvedAt || event.capturedAt > skill.resolvedAt)
  );
}

/**
 * Deep-link into Library's create flow for a topic without a skill yet, prefilled with
 * the slug and its open reports as draft intent. Keeping the slug as the name lets the
 * next fold attach the same reports to the new skill.
 */
export function libraryCreateFromReportsLink(skill: string, reports: CaptureEvent[]): string {
  const params = new URLSearchParams({ create: '1', kind: 'skills', name: skill });
  if (reports.length > 0) {
    const lines = reports.map((report) => `- [${report.type}] ${report.summary}`).join('\n');
    params.set('intent', `New skill "${skill}" distilled from these captured field reports:\n${lines}`);
  }
  return `/library?${params.toString()}`;
}
