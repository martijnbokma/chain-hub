import { z } from "zod";

import { assetKinds } from "./asset.js";

export const agentsSkillsDriftSchema = z.object({
  lockPath: z.string().nullable(),
  missingNames: z.array(z.string()),
  missingCount: z.number().int().nonnegative()
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
    /** Assets found in the hub folder. */
    indexedAssets: z.number()
  }),
  agentsSkillsDrift: agentsSkillsDriftSchema
});

/** What kind of problem a hub issue represents; drives grouping and copy. */
export const hubIssueKindSchema = z.enum([
  "health",
  "agents-drift",
  "skill-check",
  "skill-update",
  "compat",
  "sync",
  "security"
]);

/** Remediation offered on an issue; the client maps each to a concrete control. */
export const hubIssueActionSchema = z.enum([
  "retry-check",
  "retry-update",
  "relink",
  "unlink",
  "open-asset",
  "import-agents",
  "open-setup",
  "open-integrations",
  "remove-scan"
]);

export const hubIssueSchema = z.object({
  /** Stable identifier: `<kind>:<assetName|scope>`. */
  id: z.string(),
  severity: z.enum(["error", "warning"]),
  kind: hubIssueKindSchema,
  title: z.string().min(1),
  detail: z.string().optional(),
  assetKind: z.enum(assetKinds).optional(),
  assetName: z.string().optional(),
  actions: z.array(hubIssueActionSchema)
});

export const hubIssuesResultSchema = z.object({
  issues: z.array(hubIssueSchema)
});

export const integrationModeSchema = z.enum(["managed", "symlink", "missing", "conflict"]);

export const integrationSchema = z.object({
  id: z.string(),
  label: z.string(),
  targetPaths: z.array(z.string()),
  /** The editor's config folder exists on this machine. */
  installed: z.boolean(),
  connected: z.boolean(),
  mode: integrationModeSchema,
  supportedKinds: z.array(z.enum(assetKinds)),
  unsupportedKinds: z.array(z.enum(assetKinds))
});

export const validationCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["pass", "fail"]),
  detail: z.string().optional()
});

export const validationSchema = z.object({
  ok: z.boolean(),
  issues: z.array(z.string()),
  checks: z.array(validationCheckSchema)
});

/** Which part of the hub a health card covers. */
export const healthSubsystemIdSchema = z.enum(["structure", "skills", "editors", "sync", "security", "ai"]);

/** `inactive` means "not set up" (optional subsystem), not a problem. */
export const healthStatusSchema = z.enum(["healthy", "warning", "error", "inactive"]);

export const healthMetricSchema = z.object({
  label: z.string().min(1),
  value: z.string()
});

export const healthSubsystemSchema = z.object({
  id: healthSubsystemIdSchema,
  label: z.string(),
  status: healthStatusSchema,
  /** One-line human summary, e.g. "2 of 3 installed editors connected". */
  summary: z.string(),
  metrics: z.array(healthMetricSchema),
  /** Most recent timestamp the subsystem produced (last sync, update check, scan). */
  lastActivityAt: z.string().nullable().optional(),
  /** The hub issues that belong to this subsystem. */
  issues: z.array(hubIssueSchema)
});

export const healthReportSchema = z.object({
  generatedAt: z.string(),
  /** Worst status across active subsystems — `inactive` never drags it down. */
  status: z.enum(["healthy", "warning", "error"]),
  issueCount: z.number().int().nonnegative(),
  subsystems: z.array(healthSubsystemSchema)
});

export type Overview = z.infer<typeof overviewSchema>;
export type AgentsSkillsDrift = z.infer<typeof agentsSkillsDriftSchema>;
export type HubIssue = z.infer<typeof hubIssueSchema>;
export type HubIssueAction = z.infer<typeof hubIssueActionSchema>;
export type HubIssueKind = z.infer<typeof hubIssueKindSchema>;
export type HubIssuesResult = z.infer<typeof hubIssuesResultSchema>;
export type Integration = z.infer<typeof integrationSchema>;
export type IntegrationMode = z.infer<typeof integrationModeSchema>;
export type ValidationCheck = z.infer<typeof validationCheckSchema>;
export type ValidationResult = z.infer<typeof validationSchema>;
export type HealthSubsystemId = z.infer<typeof healthSubsystemIdSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type HealthMetric = z.infer<typeof healthMetricSchema>;
export type HealthSubsystem = z.infer<typeof healthSubsystemSchema>;
export type HealthReport = z.infer<typeof healthReportSchema>;
