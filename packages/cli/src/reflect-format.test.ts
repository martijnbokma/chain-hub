import { describe, expect, it } from "vitest";

import { formatReflectionReport } from "./reflect-format.js";

import type { ReflectionReport } from "@chain-hub/contracts";

describe("formatReflectionReport", () => {
  it("prints the empty-state message when no skills have events", () => {
    const report: ReflectionReport = {
      generatedAt: "2026-01-01T00:00:00.000Z",
      totalEvents: 0,
      totalSkills: 0,
      skills: [],
      logPath: "/tmp/events.jsonl"
    };

    const lines = formatReflectionReport(report);

    expect(lines).toContain(
      "No events captured yet. Run: chain capture --event note --skill <slug> --summary <text>"
    );
  });

  it("renders a trend icon and event counts per skill", () => {
    const report: ReflectionReport = {
      generatedAt: "2026-01-01T00:00:00.000Z",
      totalEvents: 3,
      totalSkills: 1,
      logPath: "/tmp/events.jsonl",
      skills: [
        {
          skill: "test-driven-development",
          totalEvents: 3,
          successCount: 2,
          failureCount: 1,
          correctionCount: 0,
          noteCount: 0,
          firstSeen: "2026-01-01T00:00:00.000Z",
          lastSeen: "2026-01-02T00:00:00.000Z",
          trend: "improving",
          recentEvents: [
            {
              id: "evt-1",
              type: "success",
              skill: "test-driven-development",
              summary: "Tests passed on first try",
              capturedAt: "2026-01-02T00:00:00.000Z"
            }
          ]
        }
      ]
    };

    const lines = formatReflectionReport(report);

    expect(lines.some((l) => l.includes("↑") && l.includes("test-driven-development"))).toBe(true);
    expect(lines.some((l) => l.includes("2 success / 1 failure / 0 correction / 0 note"))).toBe(true);
    expect(lines.some((l) => l.includes("[success] Tests passed on first try"))).toBe(true);
  });

  it("falls back to a plain marker for an unrecognized trend", () => {
    const report: ReflectionReport = {
      generatedAt: "2026-01-01T00:00:00.000Z",
      totalEvents: 1,
      totalSkills: 1,
      logPath: "/tmp/events.jsonl",
      skills: [
        {
          skill: "unknown-trend-skill",
          totalEvents: 1,
          successCount: 1,
          failureCount: 0,
          correctionCount: 0,
          noteCount: 0,
          firstSeen: "2026-01-01T00:00:00.000Z",
          lastSeen: "2026-01-01T00:00:00.000Z",
          trend: "new",
          recentEvents: []
        }
      ]
    };

    const lines = formatReflectionReport(report);

    expect(lines.some((l) => l.includes("★") && l.includes("unknown-trend-skill"))).toBe(true);
  });
});
