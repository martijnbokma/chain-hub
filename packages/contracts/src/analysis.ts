import { z } from "zod";

import { auditAssetFindingSchema, auditAssetResultSchema, classifyAssetResultSchema } from "./ai.js";
import { assetCompatIssueSchema, assetKindSchema } from "./asset.js";

export const analysisItemTypeSchema = z.enum(["kind-mismatch", "audit-findings", "compat-issue", "check-failed"]);

export const analysisItemStatusSchema = z.enum(["open", "done", "dismissed"]);

/** One actionable outcome of a library analysis run, keyed `${kind}/${name}/${type}`. */
export const analysisItemSchema = z.object({
  id: z.string().min(1),
  kind: assetKindSchema,
  name: z.string().min(1),
  type: analysisItemTypeSchema,
  status: analysisItemStatusSchema,
  /** sha256 of the asset content when analyzed; a dismissed item resurfaces once content changes. */
  contentHash: z.string(),
  recommendedKind: assetKindSchema.optional(),
  reason: z.string().optional(),
  summary: z.string().optional(),
  findings: z.array(auditAssetFindingSchema).optional(),
  compatIssues: z.array(assetCompatIssueSchema).optional(),
  error: z.string().optional()
});

export const analysisReportSchema = z.object({
  version: z.literal(1),
  runAt: z.string(),
  totalAssets: z.number().int().nonnegative(),
  items: z.array(analysisItemSchema)
});

/** Raw per-asset entry posted by the client after a run; the server derives items. */
export const analysisEntryInputSchema = z.object({
  kind: assetKindSchema,
  name: z.string().min(1),
  classification: classifyAssetResultSchema.nullable(),
  classifyError: z.string().nullable(),
  audit: auditAssetResultSchema.nullable(),
  auditError: z.string().nullable(),
  compatIssues: z.array(assetCompatIssueSchema).default([])
});

export const saveAnalysisInputSchema = z.object({
  totalAssets: z.number().int().nonnegative(),
  entries: z.array(analysisEntryInputSchema)
});

export const updateAnalysisItemInputSchema = z.object({
  id: z.string().min(1),
  status: analysisItemStatusSchema
});

export type AnalysisItemType = z.infer<typeof analysisItemTypeSchema>;
export type AnalysisItemStatus = z.infer<typeof analysisItemStatusSchema>;
export type AnalysisItem = z.infer<typeof analysisItemSchema>;
export type AnalysisReport = z.infer<typeof analysisReportSchema>;
export type AnalysisEntryInput = z.input<typeof analysisEntryInputSchema>;
export type SaveAnalysisInput = z.input<typeof saveAnalysisInputSchema>;
export type UpdateAnalysisItemInput = z.infer<typeof updateAnalysisItemInputSchema>;
