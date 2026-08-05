import { z } from "zod";

export const assetKinds = ["skills", "agents", "workflows", "rules"] as const;

export type AssetKind = (typeof assetKinds)[number];

export const assetRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(assetKinds),
  relativePath: z.string(),
  updatedAt: z.string()
});

export const assetDetailSchema = assetRecordSchema.extend({
  content: z.string()
});

export const createAssetInputSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(assetKinds),
  content: z.string().min(1)
});

export const updateAssetInputSchema = z.object({
  content: z.string().min(1)
});

export const overviewSchema = z.object({
  chainHome: z.string(),
  initializedAt: z.string().nullable(),
  assetCounts: z.record(z.enum(assetKinds), z.number()),
  health: z.object({
    initialized: z.boolean(),
    issues: z.array(z.string())
  }),
  storage: z.object({
    databasePath: z.string(),
    indexedAssets: z.number()
  })
});

export const discoveredAssetSchema = z.object({
  editorId: z.string(),
  editorLabel: z.string(),
  kind: z.enum(assetKinds),
  name: z.string(),
  preview: z.string(),
  sourcePath: z.string()
});

export const importAssetInputSchema = z.object({
  editorId: z.string(),
  kind: z.enum(assetKinds),
  name: z.string()
});

export const integrationModeSchema = z.enum(["managed", "symlink", "missing", "conflict"]);

export const integrationSchema = z.object({
  id: z.string(),
  label: z.string(),
  targetPaths: z.array(z.string()),
  connected: z.boolean(),
  mode: integrationModeSchema,
  supportedKinds: z.array(z.enum(assetKinds)),
  unsupportedKinds: z.array(z.enum(assetKinds))
});

export const validationSchema = z.object({
  ok: z.boolean(),
  issues: z.array(z.string())
});

export const setupStepSchema = z.object({
  id: z.enum(["initialize", "create-first-asset", "connect-editors", "validate"]),
  label: z.string(),
  description: z.string(),
  complete: z.boolean(),
  action: z.enum(["init", "create-asset", "connect", "validate"]),
  status: z.enum(["done", "current", "pending"])
});

export const setupGuideSchema = z.object({
  chainHome: z.string(),
  steps: z.array(setupStepSchema),
  nextAction: z.enum(["init", "create-asset", "connect", "validate", "done"])
});

export const memoryFileSchema = z.object({
  name: z.string(),
  relativePath: z.string(),
  extension: z.string(),
  sizeBytes: z.number(),
  updatedAt: z.string()
});

export const memorySummarySchema = z.object({
  chainHome: z.string(),
  memoryPath: z.string(),
  totalFiles: z.number(),
  totalBytes: z.number(),
  directories: z.array(z.string()),
  extensions: z.array(
    z.object({
      extension: z.string(),
      count: z.number()
    })
  ),
  recentFiles: z.array(memoryFileSchema),
  status: z.enum(["empty", "active"])
});

export const memoryNoteSchema = z.object({
  relativePath: z.string(),
  name: z.string(),
  title: z.string(),
  content: z.string(),
  sizeBytes: z.number(),
  updatedAt: z.string()
});

export const createMemoryNoteInputSchema = z.object({
  name: z.string().min(1),
  subdirectory: z.string().optional(),
  content: z.string()
});

export const updateMemoryNoteInputSchema = z.object({
  content: z.string()
});

export const memorySearchResultSchema = z.object({
  relativePath: z.string(),
  name: z.string(),
  title: z.string(),
  excerpt: z.string(),
  updatedAt: z.string()
});

export const captureEventTypeSchema = z.enum(["success", "failure", "correction", "note"]);

export const captureEventSchema = z.object({
  id: z.string(),
  type: captureEventTypeSchema,
  skill: z.string(),
  summary: z.string(),
  capturedAt: z.string()
});

export const captureInputSchema = z.object({
  type: captureEventTypeSchema,
  skill: z.string().min(1),
  summary: z.string().min(1)
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
  firstSeen: z.string(),
  lastSeen: z.string(),
  trend: z.enum(["improving", "struggling", "stable", "new"]),
  recentEvents: z.array(captureEventSchema)
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
export type ReflectionReport = z.infer<typeof reflectionReportSchema>;

export type AssetRecord = z.infer<typeof assetRecordSchema>;
export type AssetDetail = z.infer<typeof assetDetailSchema>;
export type CreateAssetInput = z.infer<typeof createAssetInputSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetInputSchema>;
export type Overview = z.infer<typeof overviewSchema>;
export type Integration = z.infer<typeof integrationSchema>;
export type IntegrationMode = z.infer<typeof integrationModeSchema>;
export type DiscoveredAsset = z.infer<typeof discoveredAssetSchema>;
export type ImportAssetInput = z.infer<typeof importAssetInputSchema>;
export type ValidationResult = z.infer<typeof validationSchema>;
export type SetupStep = z.infer<typeof setupStepSchema>;
export type SetupGuide = z.infer<typeof setupGuideSchema>;
export type MemoryFile = z.infer<typeof memoryFileSchema>;
export type MemorySummary = z.infer<typeof memorySummarySchema>;
export type MemoryNote = z.infer<typeof memoryNoteSchema>;
export type CreateMemoryNoteInput = z.infer<typeof createMemoryNoteInputSchema>;
export type UpdateMemoryNoteInput = z.infer<typeof updateMemoryNoteInputSchema>;
export type MemorySearchResult = z.infer<typeof memorySearchResultSchema>;
