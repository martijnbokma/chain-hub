import type {
  AssetKind,
  CaptureInput,
  CreateAssetInput,
  CreateMemoryNoteInput,
  DraftAssetInput,
  DraftPromptInput,
  ForkSkillInput,
  ImportAssetInput,
  InstallSkillBundleInput,
  InstallSkillInput,
  MigrateAgentsSkillsInput,
  UpdateAiSettingsInput,
  UpdateSkillsInput
} from "@chain-hub/contracts";
import {
  buildReflectionReport,
  captureEvent,
  writeReflectionMarkdown,
  createAsset,
  createMemoryNote,
  deleteAsset,
  deleteMemoryNote,
  discoverAssets,
  forkSkill,
  getAiSettingsPublic,
  getAsset,
  getIntegrations,
  getLearningsTimeline,
  getMemoryNote,
  getMemorySummary,
  getOverview,
  getSetupGuide,
  importDiscoveredAsset,
  initializeHub,
  installSkill,
  installSkillBundle,
  listAssets,
  listMemoryNotes,
  migrateAgentsSkills,
  readAiConfig,
  readAiSecrets,
  searchMemoryNotes,
  setupIntegrations,
  syncAssetToEditors,
  updateAiSettings,
  updateAsset,
  updateMemoryNote,
  updateSkills,
  validateHub
} from "@chain-hub/storage";

import { generateAssetDraft } from "./ai-providers.js";

export { AiProviderError } from "./ai-providers.js";

export async function initializeChainHub(chainHome?: string) {
  const result = await initializeHub(chainHome);
  return {
    message: `Initialized Chain Hub v2 at ${result.chainHome}`,
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

export async function discoverLibraryAssets() {
  return discoverAssets();
}

export async function importLibraryAsset(chainHome: string | undefined, input: ImportAssetInput) {
  const asset = await importDiscoveredAsset(chainHome, input);
  await syncAssetToEditors(chainHome, asset.kind, asset.name, asset);
  return asset;
}

export async function installLibrarySkill(chainHome: string | undefined, input: InstallSkillInput) {
  const result = await installSkill(chainHome, input);
  await syncAssetToEditors(chainHome, "skills", result.asset.name, result.asset);
  return result;
}

export async function installLibrarySkillBundle(
  chainHome: string | undefined,
  input: InstallSkillBundleInput
) {
  const result = await installSkillBundle(chainHome, input);
  await syncAssetToEditors(chainHome, "skills", result.asset.name, result.asset);
  return result;
}

export async function updateLibrarySkills(chainHome: string | undefined, input: UpdateSkillsInput = {}) {
  const result = await updateSkills(chainHome, input);

  for (const item of result.results) {
    if (item.status !== "updated" && item.status !== "migrated") {
      continue;
    }

    const asset = await getAsset(chainHome, "skills", item.name);
    await syncAssetToEditors(chainHome, "skills", item.name, asset);
  }

  return result;
}

export async function migrateAgentsLibrarySkills(
  chainHome: string | undefined,
  input: MigrateAgentsSkillsInput = {}
) {
  const result = await migrateAgentsSkills(chainHome, input);

  for (const item of result.results) {
    if (item.status !== "migrated" && item.status !== "updated") {
      continue;
    }

    const asset = await getAsset(chainHome, "skills", item.name);
    await syncAssetToEditors(chainHome, "skills", item.name, asset);
  }

  return result;
}

/** Incremental import of ~/.agents skills into Hub. Missing lock is a no-op. */
export async function syncAgentsSkillsIntoHub(
  chainHome: string | undefined,
  input: MigrateAgentsSkillsInput = {}
) {
  try {
    return await migrateAgentsLibrarySkills(chainHome, { ...input, force: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Agents skill lock not found")) {
      return {
        lockPath: input.lockPath ?? "",
        results: []
      };
    }
    throw error;
  }
}

export function summarizeAgentsSkillSync(result: { results: Array<{ status: string }> }): string {
  const migrated = result.results.filter((item) => item.status === "migrated").length;
  const skipped = result.results.filter((item) => item.status === "skipped").length;
  const failed = result.results.filter((item) => item.status === "failed").length;
  return `Agents skill sync: ${migrated} migrated, ${skipped} skipped, ${failed} failed`;
}

export async function forkLibrarySkill(chainHome: string | undefined, input: ForkSkillInput) {
  const asset = await forkSkill(chainHome, input);
  await syncAssetToEditors(chainHome, "skills", asset.name, asset);
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

export async function getHubMemory(chainHome?: string) {
  return getMemorySummary(chainHome);
}

export async function listHubMemoryNotes(chainHome?: string) {
  return listMemoryNotes(chainHome);
}

export async function getHubMemoryNote(chainHome: string | undefined, relativePath: string) {
  return getMemoryNote(chainHome, relativePath);
}

export async function createHubMemoryNote(chainHome: string | undefined, input: CreateMemoryNoteInput) {
  return createMemoryNote(chainHome, input);
}

export async function updateHubMemoryNote(chainHome: string | undefined, relativePath: string, content: string) {
  return updateMemoryNote(chainHome, relativePath, content);
}

export async function deleteHubMemoryNote(chainHome: string | undefined, relativePath: string) {
  return deleteMemoryNote(chainHome, relativePath);
}

export async function searchHubMemoryNotes(chainHome: string | undefined, query: string) {
  return searchMemoryNotes(chainHome, query);
}

export async function captureHubEvent(chainHome: string | undefined, input: CaptureInput) {
  return captureEvent(chainHome, input);
}

export async function getHubLearningsTimeline(chainHome: string | undefined, limit?: number, offset?: number) {
  return getLearningsTimeline(chainHome, limit, offset);
}

export async function getHubReflectionReport(chainHome: string | undefined) {
  return buildReflectionReport(chainHome);
}

export async function writeHubReflection(chainHome: string | undefined) {
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

/** @deprecated Prefer draftHubAsset */
export async function draftHubPrompt(chainHome: string | undefined, input: DraftPromptInput) {
  return draftHubAsset(chainHome, { ...input, kind: input.kind ?? "prompts" });
}
