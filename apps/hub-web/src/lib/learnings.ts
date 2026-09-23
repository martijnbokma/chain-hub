import type { CaptureEvent, SkillReflection } from '@/types';

export type SkillNeedingAttention = {
  skill: string;
  correctionCount: number;
  failureCount: number;
  /** Most recent correction or failure among the skill's recent events, if any. */
  latestIssue: CaptureEvent | null;
  /** Whether the skill exists in the hub, so it can be opened and audited in Library. */
  inHub: boolean;
};

/** Skills with captured corrections or failures, most issues first. */
export function selectSkillsNeedingAttention(
  skills: SkillReflection[],
  hubSkillNames: ReadonlySet<string>
): SkillNeedingAttention[] {
  return skills
    .filter((skill) => skill.correctionCount + skill.failureCount > 0)
    .map((skill) => ({
      skill: skill.skill,
      correctionCount: skill.correctionCount,
      failureCount: skill.failureCount,
      latestIssue: skill.recentEvents.find((event) => event.type === 'correction' || event.type === 'failure') ?? null,
      inHub: hubSkillNames.has(skill.skill)
    }))
    .sort(
      (a, b) =>
        b.correctionCount + b.failureCount - (a.correctionCount + a.failureCount) || a.skill.localeCompare(b.skill)
    );
}

export function librarySkillLink(skill: string): string {
  return `/library?${new URLSearchParams({ kind: 'skills', asset: skill }).toString()}`;
}
