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
    databasePath: z.string(),
    indexedAssets: z.number()
  }),
  agentsSkillsDrift: agentsSkillsDriftSchema
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

export type Overview = z.infer<typeof overviewSchema>;
export type AgentsSkillsDrift = z.infer<typeof agentsSkillsDriftSchema>;
export type Integration = z.infer<typeof integrationSchema>;
export type IntegrationMode = z.infer<typeof integrationModeSchema>;
export type ValidationCheck = z.infer<typeof validationCheckSchema>;
export type ValidationResult = z.infer<typeof validationSchema>;
