import { describe, expect, it } from "vitest";

import type { CaptureEvent, SkillReflection } from "@/types";
import { librarySkillLink, selectSkillsNeedingAttention } from "./learnings";

function event(type: CaptureEvent["type"], summary: string): CaptureEvent {
  return { id: summary, type, skill: "x", summary, capturedAt: "2026-09-01T00:00:00.000Z" };
}

function reflection(overrides: Partial<SkillReflection>): SkillReflection {
  return {
    skill: "skill",
    totalEvents: 1,
    successCount: 0,
    failureCount: 0,
    correctionCount: 0,
    noteCount: 0,
    openFailureCount: 0,
    openCorrectionCount: 0,
    resolvedAt: null,
    firstSeen: "2026-09-01T00:00:00.000Z",
    lastSeen: "2026-09-01T00:00:00.000Z",
    trend: "new",
    recentEvents: [],
    ...overrides
  };
}

describe("selectSkillsNeedingAttention", () => {
  it("keeps only skills with corrections or failures, most issues first", () => {
    const result = selectSkillsNeedingAttention(
      [
        reflection({ skill: "clean", successCount: 5 }),
        reflection({ skill: "one-issue", correctionCount: 1, openCorrectionCount: 1 }),
        reflection({ skill: "three-issues", correctionCount: 2, failureCount: 1, openCorrectionCount: 2, openFailureCount: 1 })
      ],
      new Set(["three-issues"])
    );

    expect(result.map((item) => [item.skill, item.inHub])).toEqual([
      ["three-issues", true],
      ["one-issue", false]
    ]);
  });

  it("picks the most recent correction or failure, skipping successes and notes", () => {
    const [item] = selectSkillsNeedingAttention(
      [
        reflection({
          skill: "api",
          correctionCount: 1,
          openCorrectionCount: 1,
          recentEvents: [event("success", "won"), event("note", "noted"), event("correction", "fix route")]
        })
      ],
      new Set()
    );

    expect(item?.latestIssue?.summary).toBe("fix route");
  });

  it("excludes skills whose issues are all marked addressed", () => {
    const result = selectSkillsNeedingAttention(
      [
        reflection({
          skill: "resolved",
          correctionCount: 2,
          failureCount: 1,
          openCorrectionCount: 0,
          openFailureCount: 0,
          resolvedAt: "2026-09-02T00:00:00.000Z"
        }),
        reflection({ skill: "open", correctionCount: 1, openCorrectionCount: 1 })
      ],
      new Set()
    );

    expect(result.map((item) => item.skill)).toEqual(["open"]);
  });
});

describe("librarySkillLink", () => {
  it("deep-links to the skill in Library", () => {
    expect(librarySkillLink("review-pr")).toBe("/library?kind=skills&asset=review-pr");
  });

  it("includes audit param when requested", () => {
    expect(librarySkillLink("review-pr", { audit: true })).toBe("/library?kind=skills&asset=review-pr&audit=1");
  });
});
