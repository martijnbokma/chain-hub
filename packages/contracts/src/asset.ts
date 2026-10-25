import { z } from "zod";
import { InvalidInputError } from "./errors.js";

export const assetKinds = ["skills", "agents", "workflows", "rules", "prompts"] as const;

export type AssetKind = (typeof assetKinds)[number];

export const assetKindSchema = z.enum(assetKinds);

export const skillLockSourceTypeSchema = z.enum(["path", "git"]);

export const skillLockEntrySchema = z.object({
  sourceType: skillLockSourceTypeSchema,
  source: z.string().min(1),
  subdir: z.string().nullable(),
  contentHash: z.string().nullable().optional(),
  commitSha: z.string().nullable().optional(),
  installedAt: z.string(),
  updatedAt: z.string(),
  lastCheckedAt: z.string().nullable().optional(),
  /** Remote HEAD sha seen by the last update check; compared to commitSha to flag updates. */
  latestSha: z.string().nullable().optional(),
  /** Catalog provenance when installed via a catalog entry (docs/specs/hub-catalog.md). */
  catalogId: z.string().nullable().optional(),
  catalogEntryId: z.string().nullable().optional()
});

export const assetCompatIssueCodeSchema = z.enum(["missing_description"]);

export const assetCompatIssueSchema = z.object({
  code: assetCompatIssueCodeSchema,
  severity: z.enum(["error", "warning"]),
  message: z.string().min(1)
});

export const assetRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(assetKinds),
  relativePath: z.string(),
  updatedAt: z.string(),
  provenance: skillLockEntrySchema.nullable().optional(),
  /** Frontmatter `author` when present (skills and other markdown assets). */
  author: z.string().nullable().optional(),
  /** Deterministic editor-compat findings (skills: required description, etc.). */
  compatIssues: z.array(assetCompatIssueSchema).optional()
});

export const assetDetailSchema = assetRecordSchema.extend({
  content: z.string()
});

/** A file or subfolder inside a skill's folder, other than SKILL.md itself. */
export const skillFileEntrySchema = z.object({
  path: z.string().min(1),
  size: z.number().nonnegative(),
  isDirectory: z.boolean()
});

export const skillFileContentSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  size: z.number().nonnegative(),
  truncated: z.boolean()
});

export const assetNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/, "Asset name may only contain alphanumeric characters, hyphens, and underscores")
  .refine((name) => !name.includes(".."), "Asset name cannot contain relative path navigation");

export const createAssetInputSchema = z.object({
  name: assetNameSchema,
  kind: z.enum(assetKinds),
  content: z.string().min(1)
});

export const updateAssetInputSchema = z.object({
  content: z.string().min(1)
});

export const renameAssetInputSchema = z.object({
  name: assetNameSchema
});

export const convertAssetInputSchema = z.object({
  toKind: z.enum(assetKinds),
  /** Keep current name when omitted. */
  name: assetNameSchema.optional()
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
  name: assetNameSchema
});

export const installSkillInputSchema = z
  .object({
    path: z.string().min(1).optional(),
    repo: z
      .string()
      .trim()
      .min(1)
      .refine((value) => !value.startsWith("-"), { message: "Repository must be a URL or path, not an option" })
      .optional(),
    subdir: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    force: z.boolean().optional()
  })
  .refine((value) => Boolean(value.path) !== Boolean(value.repo), {
    message: "Provide exactly one of path or repo"
  });

export const skillsLockFileSchema = z.object({
  version: z.literal(1),
  skills: z.record(z.string(), skillLockEntrySchema)
});

export const installSkillResultSchema = z.object({
  asset: assetDetailSchema,
  lockEntry: skillLockEntrySchema
});

export const installSkillBundleFileSchema = z.object({
  path: z.string().min(1).max(512),
  contentBase64: z.string()
});

export const installSkillBundleInputSchema = z.object({
  name: z.string().min(1).optional(),
  force: z.boolean().optional(),
  files: z.array(installSkillBundleFileSchema).min(1).max(500, "A skill folder can have at most 500 files")
});

export const updateSkillsInputSchema = z.object({
  name: z.string().min(1).optional(),
  force: z.boolean().optional()
});

export const forkSkillInputSchema = z.object({
  /** Kind of the upstream asset to fork; defaults to `skills`. */
  kind: assetKindSchema.optional(),
  name: z.string().min(1),
  as: z.string().min(1).optional()
});

type SkillLockEntryValue = z.infer<typeof skillLockEntrySchema>;

/** Upstream-tracked skills are overwrite targets for `skill update`; uploads and local skills are not. */
export function isUpstreamOwnedSkill(entry: SkillLockEntryValue | null | undefined): boolean {
  if (!entry) {
    return false;
  }

  return !entry.source.startsWith("upload://");
}

/** True when the last update check found the upstream HEAD ahead of the locked copy. */
export function hasSkillUpdate(entry: SkillLockEntryValue | null | undefined): boolean {
  return Boolean(entry?.latestSha && entry.latestSha !== entry.commitSha);
}

/**
 * Hub-editable assets: anything without an upstream lock entry (git/path) in assets-lock.
 * Created, forked, and uploaded assets count as editable; catalog installs of any kind do not.
 */
export function isEditableHubAsset(asset: {
  kind: AssetKind;
  provenance?: SkillLockEntryValue | null;
}): boolean {
  return !isUpstreamOwnedSkill(asset.provenance);
}

/** Normalize a skill folder/name to a kebab-case hub slug. */
export function normalizeSkillName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Derive git subdir from an agents lock skillPath (file path → parent dir). */
export function subdirFromSkillPath(skillPath: string | undefined): string | undefined {
  if (!skillPath) return undefined;
  const normalized = skillPath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return undefined;
  const dir = normalized.slice(0, lastSlash);
  if (!dir || dir === ".") return undefined;
  return dir;
}

export function assertSafeRelativeSkillPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    throw new InvalidInputError(`Unsafe skill file path: ${relativePath}`);
  }
  return normalized;
}

/** Best-effort browse URL for contributing changes back to a git skill source. */
export function resolveSkillUpstreamBrowseUrl(entry: SkillLockEntryValue | null | undefined): string | null {
  if (!entry || entry.sourceType !== "git") {
    return null;
  }

  const raw = entry.source.trim();
  const sshMatch = raw.match(/^git@([^:]+):(.+?)(?:\.git)?$/i);
  if (sshMatch) {
    const host = sshMatch[1];
    const repoPath = sshMatch[2]?.replace(/\.git$/i, "");
    if (host && repoPath) {
      return `https://${host}/${repoPath}`;
    }
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    url.username = "";
    url.password = "";
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\.git$/i, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export const skillBatchItemResultSchema = z.object({
  name: z.string(),
  status: z.enum(["updated", "skipped", "failed", "migrated"]),
  error: z.string().optional(),
  /** Commit the hub copy was locked at before this run; lets clients show old → new. */
  previousCommitSha: z.string().nullable().optional(),
  lockEntry: skillLockEntrySchema.optional()
});

export const updateSkillsResultSchema = z.object({
  results: z.array(skillBatchItemResultSchema)
});

export const migrateAgentsSkillsInputSchema = z.object({
  lockPath: z.string().min(1).optional(),
  force: z.boolean().optional()
});

export const migrateAgentsSkillsResultSchema = z.object({
  lockPath: z.string(),
  results: z.array(skillBatchItemResultSchema)
});

export type AssetCompatIssueCode = z.infer<typeof assetCompatIssueCodeSchema>;
export type AssetCompatIssue = z.infer<typeof assetCompatIssueSchema>;
export type AssetRecord = z.infer<typeof assetRecordSchema>;
export type AssetDetail = z.infer<typeof assetDetailSchema>;
export type SkillFileEntry = z.infer<typeof skillFileEntrySchema>;
export type SkillFileContent = z.infer<typeof skillFileContentSchema>;
export type CreateAssetInput = z.infer<typeof createAssetInputSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetInputSchema>;
export type RenameAssetInput = z.infer<typeof renameAssetInputSchema>;
export type ConvertAssetInput = z.infer<typeof convertAssetInputSchema>;
export type DiscoveredAsset = z.infer<typeof discoveredAssetSchema>;
export type ImportAssetInput = z.infer<typeof importAssetInputSchema>;
export type InstallSkillInput = z.infer<typeof installSkillInputSchema>;
export type InstallSkillBundleInput = z.infer<typeof installSkillBundleInputSchema>;
export type InstallSkillBundleFile = z.infer<typeof installSkillBundleFileSchema>;
export type SkillLockSourceType = z.infer<typeof skillLockSourceTypeSchema>;
export type SkillLockEntry = z.infer<typeof skillLockEntrySchema>;
export type SkillsLockFile = z.infer<typeof skillsLockFileSchema>;
export type InstallSkillResult = z.infer<typeof installSkillResultSchema>;
export type UpdateSkillsInput = z.infer<typeof updateSkillsInputSchema>;
export type ForkSkillInput = z.infer<typeof forkSkillInputSchema>;
export type SkillBatchItemResult = z.infer<typeof skillBatchItemResultSchema>;
export type UpdateSkillsResult = z.infer<typeof updateSkillsResultSchema>;
export const skillUpdateStatusSchema = z.enum(["up_to_date", "update_available", "not_applicable", "failed"]);

export const skillCheckItemResultSchema = z.object({
  name: z.string(),
  status: skillUpdateStatusSchema,
  source: z.string(),
  currentSha: z.string().nullable().optional(),
  latestSha: z.string().nullable().optional(),
  error: z.string().optional()
});

export const checkSkillUpdatesResultSchema = z.object({
  results: z.array(skillCheckItemResultSchema),
  checkedAt: z.string()
});

export const checkSkillUpdatesInputSchema = z.object({
  force: z.boolean().optional()
});

export type SkillUpdateStatus = z.infer<typeof skillUpdateStatusSchema>;
export type SkillCheckItemResult = z.infer<typeof skillCheckItemResultSchema>;
export type CheckSkillUpdatesResult = z.infer<typeof checkSkillUpdatesResultSchema>;
export type CheckSkillUpdatesInput = z.infer<typeof checkSkillUpdatesInputSchema>;
export type MigrateAgentsSkillsInput = z.infer<typeof migrateAgentsSkillsInputSchema>;
export type MigrateAgentsSkillsResult = z.infer<typeof migrateAgentsSkillsResultSchema>;
