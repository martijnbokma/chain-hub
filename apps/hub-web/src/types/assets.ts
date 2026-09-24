import type { AssetKind } from "@chain-hub/contracts";

export type {
  AssetKind,
  AssetCompatIssue,
  AssetRecord,
  AssetDetail,
  InstallSkillInput,
  InstallSkillBundleInput,
  InstallSkillResult,
  SkillFileEntry,
  SkillFileContent,
  SkillLockEntry,
  SkillBatchItemResult,
  UpdateSkillsResult,
  MigrateAgentsSkillsResult,
  CheckSkillUpdatesResult,
  SkillCheckItemResult,
  SkillUpdateStatus
} from "@chain-hub/contracts";

/** Library filter chip: all kinds or one specific kind. */
export type FilterKind = AssetKind | "__all__";

/** Library ownership filter: all assets, hub-editable only, or upstream-locked skills. */
export type OwnershipFilter = "all" | "editable" | "upstream";
