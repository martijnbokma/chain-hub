import type { AssetKind } from "@chain-hub/contracts";

// Dashboard types: the HTTP contract types from @chain-hub/contracts plus a few UI-only types.
export type {
  AgentsSkillsDrift,
  AiProvider,
  AnalysisEntryInput,
  AnalysisItem,
  AnalysisItemStatus,
  AnalysisItemType,
  AnalysisReport,
  SaveAnalysisInput,
  UpdateAnalysisItemInput,
  AiSettingsPublic,
  AssetCompatIssue,
  AssetDetail,
  AssetKind,
  AssetRecord,
  AuditAssetFinding,
  AuditAssetInput,
  AuditAssetResult,
  CaptureEvent,
  CaptureEventType,
  CaptureInput,
  CheckSkillUpdatesResult,
  ClassifyAssetInput,
  ClassifyAssetResult,
  DiscoveredAsset,
  DraftAssetInput,
  DraftAssetResult,
  DraftPromptInput,
  DraftPromptResult,
  ImportAssetInput,
  ImproveAssetInput,
  ImproveAssetResult,
  InstallSkillBundleInput,
  InstallSkillInput,
  InstallSkillResult,
  Integration,
  IntegrationMode,
  LearningsTimeline,
  MigrateAgentsSkillsResult,
  Overview,
  ReflectionReport,
  SetupGuide,
  SetupStep,
  SkillCheckItemResult,
  SkillFileContent,
  SkillFileEntry,
  SkillLockEntry,
  SkillReflection,
  SkillUpdateStatus,
  UpdateAiSettingsInput,
  UpdateSkillsResult,
  ValidationResult
} from "@chain-hub/contracts";

/** Library filter chip: all kinds or one specific kind. */
export type FilterKind = AssetKind | "__all__";

/** Library ownership filter: all assets, hub-editable only, or upstream-locked skills. */
export type OwnershipFilter = "all" | "editable" | "upstream";
