import { z } from "zod";

import { auditAssetFindingSchema } from "./ai.js";

export const captureEventTypeSchema = z.enum(["success", "failure", "correction", "note"]);

export const captureEventSchema = z.object({
  id: z.string(),
  type: captureEventTypeSchema,
  skill: z.string(),
  summary: z.string(),
  capturedAt: z.string()
});

export const learningsTimelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0)
});

export const captureInputSchema = z.object({
  type: captureEventTypeSchema,
  skill: z.string().trim().min(1).max(120),
  // Summaries are one line and end up in AI audit prompts; keep them short.
  summary: z.string().trim().min(1).max(1000)
});

export const learningsTimelineSchema = z.object({
  totalEvents: z.number(),
  returnedEvents: z.number(),
  offset: z.number(),
  skippedLines: z.number(),
  logPath: z.string(),
  events: z.array(captureEventSchema),
  status: z.enum(["empty", "active"])
});

export const skillReflectionSchema = z.object({
  skill: z.string(),
  totalEvents: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  correctionCount: z.number(),
  noteCount: z.number(),
  openFailureCount: z.number(),
  openCorrectionCount: z.number(),
  openNoteCount: z.number(),
  /** Captured-at threshold: field reports (corrections, failures and notes) up to this point are marked addressed. */
  resolvedAt: z.string().nullable(),
  firstSeen: z.string(),
  lastSeen: z.string(),
  /** Outcome balance per skill; `collecting` marks skills with only field notes, no outcome signal yet. */
  trend: z.enum(["improving", "struggling", "stable", "new", "collecting"]),
  recentEvents: z.array(captureEventSchema)
});

export const resolveLearningsInputSchema = z.object({
  skill: z.string().trim().min(1).max(120)
});

export const resolveLearningsResultSchema = z.object({
  skill: z.string(),
  resolvedAt: z.string(),
  resolvedCount: z.number()
});

/** Capture response: the stored event plus whether the slug names a skill in the hub. */
export const captureResultSchema = captureEventSchema.extend({
  knownSkill: z.boolean()
});

export const foldLearningsInputSchema = z.object({
  /** Restrict the fold to one skill slug. */
  skill: z.string().trim().min(1).max(120).optional(),
  /** Report what would change without writing skills, fold artifacts or resolve markers. */
  dryRun: z.boolean().default(false),
  /** For path-sourced upstream skills, write the improvement back to the source directory. */
  toSource: z.boolean().default(false)
});

export const foldSkillOutcomeSchema = z.enum([
  /** Editable skill rewritten by the audit+improve loop; reports resolved. */
  "applied",
  /** Audit considered the reports and found nothing actionable; reports resolved. */
  "reviewed-clean",
  /** Upstream-locked skill: improvement recorded as a contribution artifact; reports resolved. */
  "upstream-proposal",
  /** Improvement written back to the upstream path source; reports resolved. */
  "to-source",
  /** Skill too large to rewrite: findings recorded as artifact; reports resolved. */
  "findings-only",
  /** No skill asset with this slug; reports left open. */
  "orphan",
  /** Fold errored; reports left open. */
  "failed"
]);

export const foldSkillResultSchema = z.object({
  skill: z.string(),
  outcome: foldSkillOutcomeSchema,
  findingCount: z.number(),
  findings: z.array(auditAssetFindingSchema),
  /** Audit findings produced a rewrite: the skill's current content (diff base). */
  currentContent: z.string().nullable(),
  /** Audit findings produced a rewrite: the proposed new SKILL.md content. */
  proposedContent: z.string().nullable(),
  learningsConsidered: z.number(),
  artifactPath: z.string().nullable(),
  error: z.string().nullable()
});

export const foldLearningsResultSchema = z.object({
  dryRun: z.boolean(),
  results: z.array(foldSkillResultSchema),
  foldsDir: z.string(),
  foldedAt: z.string()
});

export const foldArtifactSummarySchema = z.object({
  /** Date folder the artifact lives in: YYYY-MM-DD. */
  date: z.string(),
  skill: z.string(),
  outcome: foldSkillOutcomeSchema,
  /** Where the improvement was written; null for pure proposals. */
  writtenTo: z.string().nullable(),
  fileName: z.string()
});

export const foldArtifactSchema = foldArtifactSummarySchema.extend({
  content: z.string()
});

export const reflectionReportSchema = z.object({
  generatedAt: z.string(),
  totalEvents: z.number(),
  totalSkills: z.number(),
  skills: z.array(skillReflectionSchema),
  logPath: z.string()
});

export type CaptureEventType = z.infer<typeof captureEventTypeSchema>;
export type CaptureEvent = z.infer<typeof captureEventSchema>;
export type CaptureInput = z.infer<typeof captureInputSchema>;
export type LearningsTimeline = z.infer<typeof learningsTimelineSchema>;
export type SkillReflection = z.infer<typeof skillReflectionSchema>;
export type ResolveLearningsInput = z.infer<typeof resolveLearningsInputSchema>;
export type ResolveLearningsResult = z.infer<typeof resolveLearningsResultSchema>;
export type ReflectionReport = z.infer<typeof reflectionReportSchema>;
export type CaptureResult = z.infer<typeof captureResultSchema>;
export type FoldLearningsInput = z.input<typeof foldLearningsInputSchema>;
export type FoldSkillOutcome = z.infer<typeof foldSkillOutcomeSchema>;
export type FoldSkillResult = z.infer<typeof foldSkillResultSchema>;
export type FoldLearningsResult = z.infer<typeof foldLearningsResultSchema>;
export type FoldArtifactSummary = z.infer<typeof foldArtifactSummarySchema>;
export type FoldArtifact = z.infer<typeof foldArtifactSchema>;
