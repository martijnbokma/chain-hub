import path from "node:path";
import { promises as fs } from "node:fs";

import {
  captureEventSchema,
  type CaptureEvent,
  type CaptureInput,
  type LearningsTimeline,
  type ReflectionReport,
  type SkillReflection
} from "@chain-hub/contracts";

import { initializeHub, resolveChainHome } from "./core.js";
import { ensureDir, pathExists } from "./shared.js";

function learningsLogPath(chainHome: string): string {
  return path.join(chainHome, "memory", "learnings", "events.jsonl");
}

export async function captureEvent(chainHomeInput: string | undefined, input: CaptureInput): Promise<CaptureEvent> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const logPath = learningsLogPath(chainHome);
  await ensureDir(path.dirname(logPath));

  const event: CaptureEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    skill: input.skill,
    summary: input.summary,
    capturedAt: new Date().toISOString()
  };

  await fs.appendFile(logPath, JSON.stringify(event) + "\n", "utf8");

  return event;
}

export async function getLearningsTimeline(
  chainHomeInput: string | undefined,
  limit = 100,
  offset = 0
): Promise<LearningsTimeline> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const logPath = learningsLogPath(chainHome);

  if (!(await pathExists(logPath))) {
    return { totalEvents: 0, returnedEvents: 0, offset, skippedLines: 0, logPath, events: [], status: "empty" };
  }

  const raw = await fs.readFile(logPath, "utf8");
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const events: CaptureEvent[] = [];
  let skippedLines = 0;

  for (const line of lines) {
    try {
      const parsed = captureEventSchema.parse(JSON.parse(line));
      events.push(parsed);
    } catch {
      skippedLines++;
    }
  }

  const sorted = [...events].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  const page = sorted.slice(offset, offset + limit);

  return {
    totalEvents: events.length,
    returnedEvents: page.length,
    offset,
    skippedLines,
    logPath,
    events: page,
    status: events.length === 0 ? "empty" : "active"
  };
}

export async function buildReflectionReport(chainHomeInput: string | undefined): Promise<ReflectionReport> {
  const chainHome = resolveChainHome(chainHomeInput);
  const timeline = await getLearningsTimeline(chainHome);

  const bySkill = new Map<string, CaptureEvent[]>();

  for (const event of timeline.events) {
    const list = bySkill.get(event.skill) ?? [];
    list.push(event);
    bySkill.set(event.skill, list);
  }

  const skills: SkillReflection[] = [];

  for (const [skill, events] of bySkill) {
    const sorted = [...events].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    const successCount = events.filter((e) => e.type === "success").length;
    const failureCount = events.filter((e) => e.type === "failure").length;
    const correctionCount = events.filter((e) => e.type === "correction").length;
    const noteCount = events.filter((e) => e.type === "note").length;

    let trend: SkillReflection["trend"];
    if (events.length === 1) {
      trend = "new";
    } else if (successCount > failureCount + correctionCount) {
      trend = "improving";
    } else if (failureCount + correctionCount > successCount) {
      trend = "struggling";
    } else {
      trend = "stable";
    }

    const recentEvents = [...events]
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .slice(0, 3);

    skills.push({
      skill,
      totalEvents: events.length,
      successCount,
      failureCount,
      correctionCount,
      noteCount,
      firstSeen: sorted[0].capturedAt,
      lastSeen: sorted[sorted.length - 1].capturedAt,
      trend,
      recentEvents
    });
  }

  skills.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

  return {
    generatedAt: new Date().toISOString(),
    totalEvents: timeline.totalEvents,
    totalSkills: skills.length,
    skills,
    logPath: timeline.logPath
  };
}

export async function writeReflectionMarkdown(chainHomeInput: string | undefined): Promise<{ filePath: string; content: string }> {
  const chainHome = resolveChainHome(chainHomeInput);
  const report = await buildReflectionReport(chainHome);

  const dateSlug = new Date().toISOString().slice(0, 10);
  const reflectionsDir = path.join(chainHome, "memory", "reflections");
  await ensureDir(reflectionsDir);
  const filePath = path.join(reflectionsDir, `${dateSlug}.md`);

  const trendIcon: Record<string, string> = { improving: "↑", struggling: "↓", stable: "→", new: "★" };

  const lines: string[] = [
    `# Reflection — ${dateSlug}`,
    ``,
    `> Generated ${new Date(report.generatedAt).toLocaleString()} · ${report.totalEvents} events · ${report.totalSkills} skills`,
    ``
  ];

  if (report.skills.length === 0) {
    lines.push("No events captured yet.");
  } else {
    for (const skill of report.skills) {
      const icon = trendIcon[skill.trend] ?? "?";
      lines.push(`## ${icon} ${skill.skill} \`[${skill.trend}]\``);
      lines.push(``);
      lines.push(`**${skill.totalEvents} events** · ${skill.successCount} success / ${skill.failureCount} failure / ${skill.correctionCount} correction / ${skill.noteCount} note`);
      lines.push(``);
      if (skill.recentEvents.length > 0) {
        lines.push(`### Recent events`);
        lines.push(``);
        for (const e of skill.recentEvents) {
          const ts = new Date(e.capturedAt).toLocaleDateString();
          lines.push(`- \`[${e.type}]\` ${e.summary} *(${ts})*`);
        }
        lines.push(``);
      }
    }
  }

  const content = lines.join("\n");
  await fs.writeFile(filePath, content, "utf8");

  return { filePath, content };
}
