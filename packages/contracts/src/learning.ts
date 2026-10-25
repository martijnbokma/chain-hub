import { z } from "zod";

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
  /** Captured-at threshold: corrections and failures up to this point are marked addressed. */
  resolvedAt: z.string().nullable(),
  firstSeen: z.string(),
  lastSeen: z.string(),
  trend: z.enum(["improving", "struggling", "stable", "new"]),
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
