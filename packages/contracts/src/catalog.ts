import { z } from "zod";
import { assetKindSchema } from "./asset.js";

/**
 * Chain Hub Catalog — a git-hosted pointer index (docs/specs/hub-catalog.md).
 * The index file lives at a repo root (`catalog.json`); entries point at
 * upstream source repos and never embed asset content.
 */

export const catalogKinds = ["skills", "agents", "workflows"] as const;
export type CatalogKind = (typeof catalogKinds)[number];
export const catalogKindSchema = z.enum(catalogKinds);

/** Fixed enum keeps browsing predictable; freeform tags stay flexible (VS Code pattern). */
export const catalogCategories = [
  "code-quality",
  "design",
  "docs",
  "testing",
  "devops",
  "research",
  "writing",
  "productivity",
  "editor-integration",
  "other"
] as const;
export type CatalogCategory = (typeof catalogCategories)[number];
export const catalogCategorySchema = z.enum(catalogCategories);

export const catalogEntrySourceSchema = z.object({
  /** Git URL cloneable by `git clone` (https or local path for dev/tests). */
  repo: z.string().min(1),
  /** Path inside the repo to the asset (skill dir or file dir). */
  subdir: z.string().min(1).optional(),
  /** Optional branch/tag/sha pin; default HEAD. */
  ref: z.string().min(1).optional()
});

export const catalogEntrySchema = z.object({
  /** Kebab-case, unique within the catalog; referenced as `id@catalogId` on collision. */
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Catalog id must be kebab-case"),
  kind: assetKindSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  author: z.string().min(1).optional(),
  license: z.string().min(1).optional(),
  category: catalogCategorySchema.default("other"),
  tags: z.array(z.string().min(1)).default([]),
  source: catalogEntrySourceSchema,
  /** Declared by the author; verified at install — skill bundles executable scripts. */
  hasScripts: z.boolean().default(false)
});

export const catalogIndexSchema = z.object({
  version: z.literal(1),
  catalog: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    contact: z.string().optional()
  }),
  entries: z.array(catalogEntrySchema)
});

/** A configured index source — plural-ready even though v1 ships one default. */
export const catalogSourceSchema = z.object({
  id: z.string().min(1),
  /** URL to the catalog.json file (raw https) or a local file path for dev. */
  url: z.string().min(1),
  autoRefresh: z.boolean().default(true),
  addedAt: z.string(),
  lastFetchedAt: z.string().nullable().optional()
});

export const catalogSourcesFileSchema = z.object({
  version: z.literal(1),
  sources: z.array(catalogSourceSchema)
});

/** Entry merged with local install state, as the API/UI consume it. */
export const catalogEntryResultSchema = catalogEntrySchema.extend({
  sourceId: z.string(),
  installed: z.boolean(),
  installedName: z.string().nullable().optional()
});

/** Why a catalog source could not be refreshed (or has never been fetched). */
export const catalogSourceFailureSchema = z.object({
  sourceId: z.string(),
  error: z.string()
});

export const catalogResultSchema = z.object({
  entries: z.array(catalogEntryResultSchema),
  /** True when any source served stale cached data because a refresh failed or TTL expired fetch was skipped. */
  stale: z.boolean(),
  /** Per-source refresh failures behind `stale`; absent on older servers. */
  failures: z.array(catalogSourceFailureSchema).optional(),
  checkedAt: z.string()
});

export const installCatalogEntryInputSchema = z.object({
  sourceId: z.string().min(1),
  entryId: z.string().min(1),
  force: z.boolean().optional()
});

export type CatalogEntrySource = z.infer<typeof catalogEntrySourceSchema>;
export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
export type CatalogIndex = z.infer<typeof catalogIndexSchema>;
export type CatalogSource = z.infer<typeof catalogSourceSchema>;
export type CatalogSourcesFile = z.infer<typeof catalogSourcesFileSchema>;
export type CatalogEntryResult = z.infer<typeof catalogEntryResultSchema>;
export type CatalogResult = z.infer<typeof catalogResultSchema>;
export type InstallCatalogEntryInput = z.infer<typeof installCatalogEntryInputSchema>;
