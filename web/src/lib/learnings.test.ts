import { describe, expect, it } from "vitest";

import type { CaptureEvent, SkillReflection } from "@/types";
import {
  groupReflections,
  libraryCreateFromReportsLink,
  librarySkillLink,
  selectOpenReports,
  selectSkillsNeedingAttention
} from "./learnings";

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
    openNoteCount: 0,
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

describe("selectOpenReports", () => {
  const timeline: CaptureEvent[] = [
    { id: "1", type: "note", skill: "calaca-ui", summary: "gotcha", capturedAt: "2026-11-03T00:00:00.000Z" },
    { id: "2", type: "success", skill: "calaca-ui", summary: "won", capturedAt: "2026-11-04T00:00:00.000Z" },
    { id: "3", type: "correction", skill: "other-skill", summary: "other", capturedAt: "2026-11-05T00:00:00.000Z" },
    { id: "4", type: "failure", skill: "calaca-ui", summary: "old failure", capturedAt: "2026-11-01T00:00:00.000Z" }
  ];

  it("keeps only open field reports for the skill, skipping successes and other skills", () => {
    const skill = reflection({ skill: "calaca-ui", resolvedAt: null });
    expect(selectOpenReports(timeline, skill).map((event) => event.id)).toEqual(["1", "4"]);
  });

  it("drops reports captured at or before the resolved checkpoint", () => {
    const skill = reflection({ skill: "calaca-ui", resolvedAt: "2026-11-02T00:00:00.000Z" });
    expect(selectOpenReports(timeline, skill).map((event) => event.id)).toEqual(["1"]);
  });
});

describe("groupReflections", () => {
  it("splits open and quiet collections, most open reports first", () => {
    const { open, quiet } = groupReflections([
      reflection({ skill: "quiet", lastSeen: "2026-09-03T00:00:00.000Z" }),
      reflection({ skill: "one-open", openNoteCount: 1, lastSeen: "2026-09-02T00:00:00.000Z" }),
      reflection({ skill: "three-open", openNoteCount: 2, openCorrectionCount: 1, lastSeen: "2026-09-01T00:00:00.000Z" })
    ]);

    expect(open.map((skill) => skill.skill)).toEqual(["three-open", "one-open"]);
    expect(quiet.map((skill) => skill.skill)).toEqual(["quiet"]);
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

describe("libraryCreateFromReportsLink", () => {
  it("deep-links into the create flow with the slug and reports as draft intent", () => {
    const link = libraryCreateFromReportsLink("calaca-ui", [event("note", "first"), event("correction", "second")]);
    const url = new URL(link, "https://hub.test");

    expect(url.pathname).toBe("/library");
    expect(url.searchParams.get("create")).toBe("1");
    expect(url.searchParams.get("kind")).toBe("skills");
    expect(url.searchParams.get("name")).toBe("calaca-ui");
    expect(url.searchParams.get("intent")).toContain("- [note] first");
    expect(url.searchParams.get("intent")).toContain("- [correction] second");
  });

  it("omits the intent param when there are no reports", () => {
    expect(libraryCreateFromReportsLink("x", [])).toBe("/library?create=1&kind=skills&name=x");
  });
});
