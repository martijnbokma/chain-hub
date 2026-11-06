import { z } from "zod";

/**
 * Security scanning contracts: every asset that enters the hub from an outside
 * source (git, local path, catalog, editor import, dashboard upload) is scanned
 * before it lands. Findings roll up into a pass / warn / fail verdict; `fail`
 * blocks the install unless the caller explicitly allows it anyway.
 */

export const securityScanSeveritySchema = z.enum(["high", "medium", "low"]);

export const securityScanEngineSchema = z.enum(["static", "ai"]);

export const securityScanVerdictSchema = z.enum(["pass", "warn", "fail"]);

/** Where the scanned content came from. `edit` content is user-authored and never blocks. */
export const securityScanContextSchema = z.enum([
  "install",
  "update",
  "catalog",
  "import",
  "upload",
  "edit",
  "rescan"
]);

export const securityScanFindingSchema = z.object({
  /** Stable rule identifier, e.g. `remote-code-exec` or `prompt-injection`. */
  ruleId: z.string().min(1),
  severity: securityScanSeveritySchema,
  engine: securityScanEngineSchema,
  title: z.string().min(1).max(160),
  detail: z.string().min(1).max(600),
  /** Skill-relative file path the finding belongs to, when known. */
  file: z.string().optional(),
  line: z.number().int().positive().optional()
});

export const securityScanReportSchema = z.object({
  verdict: securityScanVerdictSchema,
  findings: z.array(securityScanFindingSchema).max(50),
  /** sha1 of the scanned tree/content — matches the lock entry contentHash. */
  contentHash: z.string().min(1),
  scannedAt: z.string(),
  context: securityScanContextSchema,
  engines: z.array(securityScanEngineSchema).min(1)
});

/** Persisted per asset in `system/security-scans.json`, keyed `<kind>/<name>`. */
export const securityScanRecordSchema = securityScanReportSchema.extend({
  /** Set when a fail verdict was explicitly allowed anyway (`--allow-unsafe`). */
  overriddenAt: z.string().nullable().optional(),
  /** Set when the AI layer was requested but unreachable; the static verdict still stands. */
  aiError: z.string().nullable().optional()
});

export const securityScansFileSchema = z.object({
  version: z.literal(1),
  scans: z.record(z.string(), securityScanRecordSchema)
});

export const rescanAssetsInputSchema = z.object({
  /** Rescan a single asset kind, or a single asset when `name` is set. Default: everything. */
  kind: z.string().min(1).optional(),
  name: z.string().min(1).optional()
});

export const rescanAssetItemResultSchema = z.object({
  /** Validated upstream via assertSafeAssetKind; kept as string to avoid an asset.ts cycle. */
  kind: z.string().min(1),
  name: z.string(),
  scan: securityScanRecordSchema
});

export const rescanAssetsResultSchema = z.object({
  results: z.array(rescanAssetItemResultSchema),
  scannedAt: z.string()
});

/** Worst verdict wins; `edit` context is capped at warn so authoring never blocks. */
export function verdictForFindings(
  findings: ReadonlyArray<{ severity: z.infer<typeof securityScanSeveritySchema> }>,
  context: z.infer<typeof securityScanContextSchema>
): z.infer<typeof securityScanVerdictSchema> {
  const raw = findings.some((finding) => finding.severity === "high") ? "fail" : findings.length > 0 ? "warn" : "pass";
  return context === "edit" && raw === "fail" ? "warn" : raw;
}

export type SecurityScanSeverity = z.infer<typeof securityScanSeveritySchema>;
export type SecurityScanEngine = z.infer<typeof securityScanEngineSchema>;
export type SecurityScanVerdict = z.infer<typeof securityScanVerdictSchema>;
export type SecurityScanContext = z.infer<typeof securityScanContextSchema>;
export type SecurityScanFinding = z.infer<typeof securityScanFindingSchema>;
export type SecurityScanReport = z.infer<typeof securityScanReportSchema>;
export type SecurityScanRecord = z.infer<typeof securityScanRecordSchema>;
export type SecurityScansFile = z.infer<typeof securityScansFileSchema>;
export type RescanAssetsInput = z.input<typeof rescanAssetsInputSchema>;
export type RescanAssetItemResult = z.infer<typeof rescanAssetItemResultSchema>;
export type RescanAssetsResult = z.infer<typeof rescanAssetsResultSchema>;
