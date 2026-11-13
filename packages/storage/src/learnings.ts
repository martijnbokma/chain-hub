import path from "node:path";
import { promises as fs } from "node:fs";

import {
  captureEventSchema,
  InvalidInputError,
  normalizeSkillName,
  NotFoundError,
  type AuditAssetFinding,
  type CaptureEvent,
  type CaptureInput,
  type CaptureResult,
  type FoldArtifact,
  type FoldArtifactSummary,
  type LearningsTimeline,
  type ReflectionReport,
  type ResolveLearningsResult,
  type SkillLockEntry,
  type SkillReflection
} from "@chain-hub/contracts";

import { initializeHub, resolveChainHome } from "./core.js";
import { prepareAssetContent } from "./asset-paths.js";
import { runSecurityGate } from "./security-gate.js";
import { ensureDir, pathExists } from "./shared.js";

/**
 * Events are keyed by skill slug, typed by hand or by an agent ("PDF-Tool", "pdf tool").
 * Compare normalized slugs so they all reach the audit and reflection of skills/pdf-tool.
 */
function skillKey(skill: string): string {
  return normalizeSkillName(skill) || skill.trim();
}

function learningsLogPath(chainHome: string): string {
  return path.join(chainHome, "memory", "learnings", "events.jsonl");
}

function resolvedMarkersPath(chainHome: string): string {
  return path.join(chainHome, "memory", "learnings", "resolved.json");
}

/** Skill key → captured-at threshold: corrections/failures up to it count as addressed. */
type ResolvedMarkers = Record<string, string>;

async function readResolvedMarkers(chainHome: string): Promise<ResolvedMarkers> {
  const filePath = resolvedMarkersPath(chainHome);
  if (!(await pathExists(filePath))) {
    return {};
  }
  try {
    const raw: unknown = JSON.parse(await fs.readFile(filePath, "utf8"));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).filter(([, value]) => typeof value === "string")
    ) as ResolvedMarkers;
  } catch {
    return {};
  }
}

export async function captureEvent(chainHomeInput: string | undefined, input: CaptureInput): Promise<CaptureResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const logPath = learningsLogPath(chainHome);
  await ensureDir(path.dirname(logPath));

  const event: CaptureEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    skill: skillKey(input.skill),
    summary: input.summary,
    capturedAt: new Date().toISOString()
  };

  await fs.appendFile(logPath, JSON.stringify(event) + "\n", "utf8");

  // `--skill` doubles as a free-form topic slug; the flag just tells callers
  // whether this event can ever be folded into an actual hub skill.
  const knownSkill = await pathExists(path.join(chainHome, "skills", event.skill, "SKILL.md"));

  return { ...event, knownSkill };
}

type LearningsLog = {
  logPath: string;
  /** Newest first. */
  events: CaptureEvent[];
  skippedLines: number;
};

async function readLearningsLog(chainHome: string): Promise<LearningsLog> {
  const logPath = learningsLogPath(chainHome);

  if (!(await pathExists(logPath))) {
    return { logPath, events: [], skippedLines: 0 };
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

  events.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

  return { logPath, events, skippedLines };
}

export async function getLearningsTimeline(
  chainHomeInput: string | undefined,
  limit = 100,
  offset = 0
): Promise<LearningsTimeline> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const { logPath, events, skippedLines } = await readLearningsLog(chainHome);
  const page = events.slice(offset, offset + limit);

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

/** Event types that carry something a skill should learn; routine successes are excluded. */
const SKILL_FEEDBACK_TYPES = new Set<CaptureEvent["type"]>(["correction", "failure", "note"]);

function isOpen(event: CaptureEvent, resolvedAt: string | null): boolean {
  return !resolvedAt || event.capturedAt > resolvedAt;
}

/** Most recent unaddressed corrections, failures and notes for one skill, newest first. */
export async function getSkillLearnings(
  chainHomeInput: string | undefined,
  skill: string,
  limit = 10
): Promise<CaptureEvent[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  const { events } = await readLearningsLog(chainHome);
  const markers = await readResolvedMarkers(chainHome);
  const resolvedAt = markers[skillKey(skill)] ?? null;

  return events
    .filter(
      (event) =>
        skillKey(event.skill) === skillKey(skill) && SKILL_FEEDBACK_TYPES.has(event.type) && isOpen(event, resolvedAt)
    )
    .slice(0, limit);
}

/** Mark a skill's captured field reports (corrections, failures and notes) as addressed up to its latest event. */
export async function resolveSkillLearnings(
  chainHomeInput: string | undefined,
  skill: string
): Promise<ResolveLearningsResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  const { events } = await readLearningsLog(chainHome);
  const key = skillKey(skill);

  const markers = await readResolvedMarkers(chainHome);
  const previous = markers[key] ?? null;
  const skillEvents = events.filter((event) => skillKey(event.skill) === key);
  const openReports = skillEvents.filter(
    (event) => SKILL_FEEDBACK_TYPES.has(event.type) && isOpen(event, previous)
  );

  if (openReports.length === 0) {
    throw new NotFoundError(`No open field reports captured for skill "${key}"`);
  }

  // The marker checkpoints every event captured so far, not only the issues:
  // a note logged after the last correction was already seen when resolving.
  const resolvedAt = skillEvents.reduce((max, event) => (event.capturedAt > max ? event.capturedAt : max), "");
  markers[key] = resolvedAt;

  const filePath = resolvedMarkersPath(chainHome);
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(markers, null, 2) + "\n", "utf8");

  return { skill: key, resolvedAt, resolvedCount: openReports.length };
}

export async function buildReflectionReport(chainHomeInput: string | undefined): Promise<ReflectionReport> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  const { logPath, events: allEvents } = await readLearningsLog(chainHome);
  const markers = await readResolvedMarkers(chainHome);

  const bySkill = new Map<string, CaptureEvent[]>();

  for (const event of allEvents) {
    const key = skillKey(event.skill);
    const list = bySkill.get(key) ?? [];
    list.push(event);
    bySkill.set(key, list);
  }

  const skills: SkillReflection[] = [];

  for (const [skill, events] of bySkill) {
    const sorted = [...events].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    const resolvedAt = markers[skill] ?? null;
    const successCount = events.filter((e) => e.type === "success").length;
    const failureCount = events.filter((e) => e.type === "failure").length;
    const correctionCount = events.filter((e) => e.type === "correction").length;
    const noteCount = events.filter((e) => e.type === "note").length;
    const openFailureCount = events.filter((e) => e.type === "failure" && isOpen(e, resolvedAt)).length;
    const openCorrectionCount = events.filter((e) => e.type === "correction" && isOpen(e, resolvedAt)).length;
    const openNoteCount = events.filter((e) => e.type === "note" && isOpen(e, resolvedAt)).length;

    let trend: SkillReflection["trend"];
    if (events.length === 1) {
      trend = "new";
    } else if (successCount === 0 && failureCount + correctionCount === 0) {
      trend = "collecting";
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
      openFailureCount,
      openCorrectionCount,
      openNoteCount,
      resolvedAt,
      firstSeen: sorted[0].capturedAt,
      lastSeen: sorted[sorted.length - 1].capturedAt,
      trend,
      recentEvents
    });
  }

  skills.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

  return {
    generatedAt: new Date().toISOString(),
    totalEvents: allEvents.length,
    totalSkills: skills.length,
    skills,
    logPath
  };
}

export async function writeReflectionMarkdown(chainHomeInput: string | undefined): Promise<{ filePath: string; content: string }> {
  const chainHome = resolveChainHome(chainHomeInput);
  const report = await buildReflectionReport(chainHome);

  const dateSlug = new Date().toISOString().slice(0, 10);
  const reflectionsDir = path.join(chainHome, "memory", "reflections");
  await ensureDir(reflectionsDir);
  const filePath = path.join(reflectionsDir, `${dateSlug}.md`);

  const trendIcon: Record<string, string> = { improving: "↑", struggling: "↓", stable: "→", new: "★", collecting: "•" };

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

export function foldsDir(chainHome: string): string {
  return path.join(chainHome, "memory", "learnings", "folds");
}

export type FoldArtifactInput = {
  skill: string;
  outcome: "applied" | "upstream-proposal" | "to-source" | "findings-only";
  auditSummary: string;
  findings: AuditAssetFinding[];
  events: CaptureEvent[];
  before: string;
  after: string;
  provenance?: SkillLockEntry | null;
  /** Where the improvement was actually written: hub asset path or upstream source path. */
  writtenTo?: string | null;
};

/**
 * Record one fold as a dated markdown artifact under memory/learnings/folds/<date>/.
 * The artifact carries findings, folded reports and before/after content — the
 * audit trail that makes unattended writes reviewable (and revertable) afterwards.
 */
export async function writeFoldArtifact(
  chainHomeInput: string | undefined,
  input: FoldArtifactInput
): Promise<{ filePath: string; content: string }> {
  const chainHome = resolveChainHome(chainHomeInput);
  const dateSlug = new Date().toISOString().slice(0, 10);
  const dir = path.join(foldsDir(chainHome), dateSlug);
  await ensureDir(dir);
  const filePath = path.join(dir, `${skillKey(input.skill)}.md`);

  const lines: string[] = [
    `# Fold — ${input.skill}`,
    ``,
    `> ${new Date().toISOString()} · outcome: ${input.outcome}${input.writtenTo ? ` · written to ${input.writtenTo}` : ""}`,
    ``,
    `## Audit summary`,
    ``,
    input.auditSummary,
    ``,
    `## Findings applied (${input.findings.length})`,
    ``
  ];
  for (const finding of input.findings) {
    lines.push(`- **[${finding.severity}]** ${finding.title} — ${finding.detail} *(source: ${finding.source ?? "best-practice"})*`);
  }
  lines.push(``, `## Field reports folded (${input.events.length})`, ``);
  for (const event of input.events) {
    lines.push(`- \`[${event.type}]\` ${event.summary} *(${event.capturedAt})*`);
  }
  if (input.provenance) {
    lines.push(
      ``,
      `## Provenance`,
      ``,
      `- sourceType: ${input.provenance.sourceType}`,
      `- source: ${input.provenance.source}`,
      input.provenance.subdir ? `- subdir: ${input.provenance.subdir}` : `- subdir: (root)`
    );
  }
  lines.push(``, `## Before`, ``, "```markdown", input.before.trimEnd(), "```", ``, `## After`, ``, "```markdown", input.after.trimEnd(), "```", ``);

  const content = lines.join("\n");
  await fs.writeFile(filePath, content, "utf8");

  return { filePath, content };
}

const FOLD_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FOLD_SLUG_RE = /^[a-z0-9-]+$/;

function foldArtifactPath(chainHome: string, date: string, skill: string): string {
  if (!FOLD_DATE_RE.test(date) || !FOLD_SLUG_RE.test(skill)) {
    throw new InvalidInputError(`Invalid fold artifact reference: ${date}/${skill}`);
  }
  const dir = path.resolve(foldsDir(chainHome), date);
  const filePath = path.resolve(dir, `${skill}.md`);
  if (!filePath.startsWith(dir + path.sep)) {
    throw new InvalidInputError(`Unsafe fold artifact path: ${date}/${skill}`);
  }
  return filePath;
}

/** Fold artifacts on disk, newest date first, for the read-only review surface. */
export async function listFoldArtifacts(chainHomeInput: string | undefined): Promise<FoldArtifactSummary[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  const root = foldsDir(chainHome);
  if (!(await pathExists(root))) {
    return [];
  }

  const out: FoldArtifactSummary[] = [];
  for (const date of (await fs.readdir(root)).filter((name) => FOLD_DATE_RE.test(name))) {
    const dir = path.join(root, date);
    for (const fileName of (await fs.readdir(dir)).filter((name) => name.endsWith(".md"))) {
      const raw = await fs.readFile(path.join(dir, fileName), "utf8");
      const header = raw.split("\n").find((line) => line.startsWith("> ")) ?? "";
      const outcome = (header.match(/outcome: ([a-z-]+)/)?.[1] ?? "applied") as FoldArtifactSummary["outcome"];
      const writtenTo = header.match(/written to (.+)$/)?.[1]?.trim() ?? null;
      out.push({ date, skill: fileName.slice(0, -3), outcome, writtenTo, fileName });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.skill.localeCompare(b.skill));
}

export async function readFoldArtifact(
  chainHomeInput: string | undefined,
  date: string,
  skill: string
): Promise<FoldArtifact> {
  const chainHome = resolveChainHome(chainHomeInput);
  const filePath = foldArtifactPath(chainHome, date, skill);
  if (!(await pathExists(filePath))) {
    throw new NotFoundError(`Fold artifact not found: ${date}/${skill}`);
  }
  const content = await fs.readFile(filePath, "utf8");
  const header = content.split("\n").find((line) => line.startsWith("> ")) ?? "";
  const outcome = (header.match(/outcome: ([a-z-]+)/)?.[1] ?? "applied") as FoldArtifact["outcome"];
  const writtenTo = header.match(/written to (.+)$/)?.[1]?.trim() ?? null;
  return { date, skill, outcome, writtenTo, fileName: `${skill}.md`, content };
}

/**
 * Write an improved SKILL.md back to a path-sourced skill's origin directory,
 * updating the maker's copy so future installs/updates carry the improvement.
 */
export async function writeSkillToPathSource(
  chainHomeInput: string | undefined,
  entry: SkillLockEntry,
  skill: string,
  content: string
): Promise<{ filePath: string }> {
  if (entry.sourceType !== "path") {
    throw new InvalidInputError(`Skill "${skill}" is not installed from a local path source`);
  }
  const chainHome = resolveChainHome(chainHomeInput);
  const sourceDir = path.resolve(entry.source);
  const filePath = path.join(sourceDir, "SKILL.md");
  if (!(await pathExists(filePath))) {
    throw new NotFoundError(`Source SKILL.md not found at ${filePath}`);
  }

  const prepared = prepareAssetContent("skills", skill, content);
  await runSecurityGate(chainHome, {
    kind: "skills",
    name: skill,
    context: "edit",
    files: [{ path: "SKILL.md", content: prepared }]
  });

  await fs.writeFile(filePath, prepared, "utf8");
  return { filePath };
}
