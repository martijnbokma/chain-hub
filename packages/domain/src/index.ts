import type {
  AssetKind,
  AuditAssetInput,
  CaptureInput,
  ClassifyAssetInput,
  ConvertAssetInput,
  CreateAssetInput,
  DraftAssetInput,
  DraftPromptInput,
  ImportAssetInput,
  ImproveAssetInput,
  RenameAssetInput,
  UpdateAiSettingsInput
} from "@chain-hub/contracts";
import {
  buildReflectionReport,
  captureEvent,
  writeReflectionMarkdown,
  convertAssetKind,
  createAsset,
  deleteAsset,
  discoverAssets,
  getAiSettingsPublic,
  getAsset,
  getIntegrations,
  getLearningsTimeline,
  getSkillLearnings,
  getOverview,
  getSetupGuide,
  importDiscoveredAsset,
  initializeHub,
  listAssets,
  listSkillFiles,
  readAiConfig,
  readAiSecrets,
  readSkillFile,
  renameAsset,
  resolveSkillLearnings,
  setupIntegrations,
  syncAssetToEditors,
  updateAiSettings,
  updateAsset,
  validateHub
} from "@chain-hub/storage";

import { auditExistingAsset, classifyExistingAsset, generateAssetDraft, improveExistingAsset } from "./ai-providers.js";

export { AiProviderError } from "./ai-providers.js";
export {
  checkLibrarySkillUpdates,
  forkLibrarySkill,
  getHubAgentsSkillsDrift,
  installLibrarySkill,
  installLibrarySkillBundle,
  migrateAgentsLibrarySkills,
  summarizeAgentsSkillSync,
  syncAgentsSkillsIntoHub,
  updateLibrarySkills
} from "./skills.js";

export { getHubAnalysisReport, saveHubAnalysisReport, updateHubAnalysisItemStatus } from "./analysis.js";

export { getLibraryCatalog, installLibraryCatalogEntry, refreshLibraryCatalog } from "./catalog.js";

export async function initializeChainHub(chainHome?: string) {
  const result = await initializeHub(chainHome);
  return {
    message: `Initialized Chain Hub at ${result.chainHome}`,
    chainHome: result.chainHome,
    isFirstRun: result.isFirstRun
  };
}

export async function getDashboardOverview(chainHome?: string) {
  return getOverview(chainHome);
}

export async function getLibrary(chainHome?: string, kind?: AssetKind) {
  return listAssets(chainHome, kind);
}

export async function getLibraryAsset(chainHome: string | undefined, kind: AssetKind, name: string) {
  return getAsset(chainHome, kind, name);
}

export async function createLibraryAsset(chainHome: string | undefined, input: CreateAssetInput) {
  const asset = await createAsset(chainHome, input);
  await syncAssetToEditors(chainHome, asset.kind, asset.name, asset);
  return asset;
}

export async function updateLibraryAsset(chainHome: string | undefined, kind: AssetKind, name: string, content: string) {
  const asset = await updateAsset(chainHome, kind, name, content);
  await syncAssetToEditors(chainHome, asset.kind, asset.name, asset);
  return asset;
}

export async function deleteLibraryAsset(chainHome: string | undefined, kind: AssetKind, name: string) {
  await deleteAsset(chainHome, kind, name);
  await syncAssetToEditors(chainHome, kind, name, null);
}

export async function getSkillFiles(chainHome: string | undefined, name: string) {
  return listSkillFiles(chainHome, name);
}

export async function getSkillFile(chainHome: string | undefined, name: string, path: string) {
  return readSkillFile(chainHome, name, path);
}

export async function renameLibraryAsset(
  chainHome: string | undefined,
  kind: AssetKind,
  name: string,
  input: RenameAssetInput
) {
  await syncAssetToEditors(chainHome, kind, name, null);
  const asset = await renameAsset(chainHome, kind, name, input.name);
  await syncAssetToEditors(chainHome, asset.kind, asset.name, asset);
  return asset;
}

export async function convertLibraryAssetKind(
  chainHome: string | undefined,
  kind: AssetKind,
  name: string,
  input: ConvertAssetInput
) {
  await syncAssetToEditors(chainHome, kind, name, null);
  const asset = await convertAssetKind(chainHome, kind, name, input.toKind, input.name);
  await syncAssetToEditors(chainHome, asset.kind, asset.name, asset);
  return asset;
}

export async function discoverLibraryAssets(chainHome?: string) {
  return discoverAssets(chainHome);
}

export async function importLibraryAsset(chainHome: string | undefined, input: ImportAssetInput) {
  const asset = await importDiscoveredAsset(chainHome, input);
  await syncAssetToEditors(chainHome, asset.kind, asset.name, asset);
  return asset;
}

export async function getIntegrationStatus(chainHome?: string) {
  return getIntegrations(chainHome);
}

export async function connectEditors(chainHome?: string) {
  return setupIntegrations(chainHome);
}

export async function validateChainHub(chainHome?: string) {
  return validateHub(chainHome);
}

export async function getGuidedSetup(chainHome?: string) {
  return getSetupGuide(chainHome);
}

export async function captureHubEvent(chainHome: string | undefined, input: CaptureInput) {
  return captureEvent(chainHome, input);
}

export async function getHubLearningsTimeline(chainHome: string | undefined, limit?: number, offset?: number) {
  return getLearningsTimeline(chainHome, limit, offset);
}

export async function getHubReflectionReport(chainHome?: string) {
  return buildReflectionReport(chainHome);
}

export async function resolveHubSkillLearnings(chainHome: string | undefined, skill: string) {
  return resolveSkillLearnings(chainHome, skill);
}

export async function writeHubReflection(chainHome?: string) {
  return writeReflectionMarkdown(chainHome);
}

export async function getHubAiSettings(chainHome?: string) {
  return getAiSettingsPublic(chainHome);
}

export async function updateHubAiSettings(chainHome: string | undefined, input: UpdateAiSettingsInput) {
  return updateAiSettings(chainHome, input);
}

export async function draftHubAsset(chainHome: string | undefined, input: DraftAssetInput) {
  const config = await readAiConfig(chainHome);
  const secrets = await readAiSecrets(chainHome);
  return generateAssetDraft({ config, secrets, input });
}

export async function classifyHubAsset(chainHome: string | undefined, input: ClassifyAssetInput) {
  const config = await readAiConfig(chainHome);
  const secrets = await readAiSecrets(chainHome);
  const content =
    input.content?.trim() ||
    (await getAsset(chainHome, input.kind, input.name)).content;
  return classifyExistingAsset({
    config,
    secrets,
    currentKind: input.kind,
    name: input.name,
    content
  });
}

/** Max captured learning events given to one audit, to keep the prompt focused. */
const AUDIT_LEARNINGS_LIMIT = 10;

export async function auditHubAsset(chainHome: string | undefined, input: AuditAssetInput) {
  const config = await readAiConfig(chainHome);
  const secrets = await readAiSecrets(chainHome);
  const content =
    input.content?.trim() ||
    (await getAsset(chainHome, input.kind, input.name)).content;
  // Learning events are captured per skill slug, so only skills receive field reports.
  const learnings =
    input.kind === "skills" ? await getSkillLearnings(chainHome, input.name, AUDIT_LEARNINGS_LIMIT) : undefined;
  const result = await auditExistingAsset({
    config,
    secrets,
    kind: input.kind,
    name: input.name,
    content,
    learnings
  });
  return learnings ? { ...result, learningsConsidered: learnings.length } : result;
}

export async function improveHubAsset(chainHome: string | undefined, input: ImproveAssetInput) {
  const config = await readAiConfig(chainHome);
  const secrets = await readAiSecrets(chainHome);
  const content =
    input.content?.trim() ||
    (await getAsset(chainHome, input.kind, input.name)).content;
  return improveExistingAsset({
    config,
    secrets,
    kind: input.kind,
    name: input.name,
    content,
    summary: input.summary,
    findings: input.findings
  });
}

/** @deprecated Prefer draftHubAsset */
export async function draftHubPrompt(chainHome: string | undefined, input: DraftPromptInput) {
  return draftHubAsset(chainHome, { ...input, kind: input.kind ?? "prompts" });
}
