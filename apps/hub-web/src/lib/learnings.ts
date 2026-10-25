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
