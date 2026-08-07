export type AssetKind = "skills" | "agents" | "workflows" | "rules" | "prompts";
export type FilterKind = AssetKind | "__all__";

export type SkillLockEntry = {
  sourceType: "path" | "git";
  source: string;
  subdir: string | null;
  contentHash?: string | null;
  installedAt: string;
  updatedAt: string;
};

export type AssetRecord = {
  id: string;
  name: string;
  kind: string;
  relativePath: string;
  updatedAt: string;
  provenance?: SkillLockEntry | null;
};

export type AssetDetail = AssetRecord & {
  content: string;
};

export type InstallSkillInput = {
  path?: string;
  repo?: string;
  subdir?: string;
  name?: string;
  force?: boolean;
};

export type InstallSkillBundleInput = {
  name?: string;
  force?: boolean;
  files: Array<{ path: string; contentBase64: string }>;
};

export type InstallSkillResult = {
  asset: AssetDetail;
  lockEntry: SkillLockEntry;
};

export type SkillBatchItemResult = {
  name: string;
  status: "updated" | "skipped" | "failed" | "migrated";
  error?: string;
  lockEntry?: SkillLockEntry;
};

export type UpdateSkillsResult = {
  results: SkillBatchItemResult[];
};

export type MigrateAgentsSkillsResult = {
  lockPath: string;
  results: SkillBatchItemResult[];
};
