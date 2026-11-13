import type {
  AgentsSkillsDrift,
  AssetDetail,
  ExportGhAwInput,
  CheckSkillUpdatesInput,
  CheckSkillUpdatesResult,
  DiscoverSkillDirsInput,
  DiscoverSkillDirsResult,
  ForkSkillInput,
  InstallRepoBundleInput,
  InstallRepoBundleResult,
  InstallSkillBundleInput,
  InstallSkillInput,
  InstallSkillResult,
  MigrateAgentsSkillsInput,
  MigrateAgentsSkillsResult,
  ScanSkillSourceInput,
  ScanSkillSourceResult,
  SkillBatchItemResult,
  UpdateSkillsInput,
  UpdateSkillsResult
} from "@chain-hub/contracts";
import {
  checkSkillUpdatesFromLock,
  detectAgentsSkillsDrift,
  discoverGitSkills,
  exportWorkflowToGhAw,
  type ExportGhAwResult,
  forkHubAsset,
  forkSkillFromHub,
  getAsset,
  initializeHub,
  installRepoBundle,
  installSkillFromBundle,
  installSkillFromSource,
  listSkillUpstreamDirs,
  migrateAgentsSkillLock,
  previewSkillScan,
  relinkSkill,
  resolveChainHome,
  syncAssetToEditors,
  unlinkSkill,
  updateSkillsFromLock
} from "@chain-hub/storage";

import { buildSecurityExtraScanner } from "./security.js";

/**
 * Skill install / update / migrate / fork use-cases.
 * Storage owns filesystem + git I/O (`skill-install.ts`); this module owns hub
 * orchestration (init, index sync hooks via storage callbacks, editor projection).
 */

async function withInitializedHub(chainHomeInput: string | undefined): Promise<string> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  return chainHome;
}

const readSkillAsset = async (home: string, kind: "skills", name: string) => getAsset(home, kind, name);

/** Re-projects every skill a batch run replaced in the hub; skipped and failed items are left alone. */
async function projectChangedSkills(chainHome: string, results: SkillBatchItemResult[]): Promise<void> {
  for (const item of results) {
    if (item.status !== "updated" && item.status !== "migrated") {
      continue;
    }
    const asset = await getAsset(chainHome, "skills", item.name);
    await syncAssetToEditors(chainHome, "skills", item.name, asset);
  }
}

export async function installLibrarySkill(
  chainHomeInput: string | undefined,
  input: InstallSkillInput
): Promise<InstallSkillResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const extraScanner = await buildSecurityExtraScanner(chainHome);
  const result = await installSkillFromSource(chainHome, input, readSkillAsset, { extraScanner });
  await syncAssetToEditors(chainHome, "skills", result.asset.name, result.asset);
  return result;
}

export async function installLibrarySkillBundle(
  chainHomeInput: string | undefined,
  input: InstallSkillBundleInput
): Promise<InstallSkillResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const extraScanner = await buildSecurityExtraScanner(chainHome);
  const result = await installSkillFromBundle(chainHome, input, readSkillAsset, { extraScanner });
  await syncAssetToEditors(chainHome, "skills", result.asset.name, result.asset);
  return result;
}

export async function installLibraryRepoBundle(
  chainHomeInput: string | undefined,
  input: InstallRepoBundleInput
): Promise<InstallRepoBundleResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const extraScanner = await buildSecurityExtraScanner(chainHome);
  const result = await installRepoBundle(chainHome, input, readSkillAsset, { extraScanner });

  for (const item of result.installed) {
    const asset = await getAsset(chainHome, item.kind, item.name);
    await syncAssetToEditors(chainHome, item.kind, item.name, asset);
  }
  return result;
}

/** Exports a hub workflow into a repo's .github/workflows dir (gh-aw format — repo-scoped, one-shot). */
export async function exportLibraryWorkflowToGhAw(
  chainHomeInput: string | undefined,
  input: ExportGhAwInput
): Promise<ExportGhAwResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const asset = await getAsset(chainHome, "workflows", input.name);
  return exportWorkflowToGhAw(asset, input.repoDir, { force: input.force });
}

/** Advisory pre-install scan — same gate as install, but copies nothing and records nothing. */
export async function scanLibrarySkillSource(
  chainHomeInput: string | undefined,
  input: ScanSkillSourceInput
): Promise<ScanSkillSourceResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const extraScanner = await buildSecurityExtraScanner(chainHome);
  return previewSkillScan(chainHome, input, { context: "install", extraScanner });
}

export async function updateLibrarySkills(
  chainHomeInput: string | undefined,
  input: UpdateSkillsInput = {}
): Promise<UpdateSkillsResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const extraScanner = await buildSecurityExtraScanner(chainHome);
  const result = await updateSkillsFromLock(chainHome, input, readSkillAsset, { extraScanner });

  await projectChangedSkills(chainHome, result.results);

  return result;
}

export async function checkLibrarySkillUpdates(
  chainHomeInput: string | undefined,
  input: CheckSkillUpdatesInput = {}
): Promise<CheckSkillUpdatesResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  return checkSkillUpdatesFromLock(chainHome, input);
}

export async function migrateAgentsLibrarySkills(
  chainHomeInput: string | undefined,
  input: MigrateAgentsSkillsInput = {}
): Promise<MigrateAgentsSkillsResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const extraScanner = await buildSecurityExtraScanner(chainHome);
  const result = await migrateAgentsSkillLock(chainHome, input, readSkillAsset, { extraScanner });

  await projectChangedSkills(chainHome, result.results);

  return result;
}

/** Incremental import of ~/.agents skills into Hub. Missing lock is a no-op. */
export async function syncAgentsSkillsIntoHub(
  chainHomeInput: string | undefined,
  input: MigrateAgentsSkillsInput = {}
): Promise<MigrateAgentsSkillsResult> {
  try {
    return await migrateAgentsLibrarySkills(chainHomeInput, { ...input, force: false });
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

export async function forkLibrarySkill(
  chainHomeInput: string | undefined,
  input: ForkSkillInput
): Promise<AssetDetail> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const kind = input.kind ?? "skills";
  const asset =
    kind === "skills"
      ? await forkSkillFromHub(chainHome, input, readSkillAsset)
      : await forkHubAsset(chainHome, kind, input.name, input.as);
  await syncAssetToEditors(chainHome, kind, asset.name, asset);
  return asset;
}

/** Detaches the lock entry: the skill stays in the hub and becomes hub-editable, keeping provenance. */
export async function unlinkLibrarySkill(
  chainHomeInput: string | undefined,
  name: string,
  reason: "source-missing" | "manual" = "manual"
): Promise<{ ok: true }> {
  const chainHome = await withInitializedHub(chainHomeInput);
  await unlinkSkill(chainHome, name, reason);
  return { ok: true };
}

/** SKILL.md locations inside an arbitrary git repo; feeds the install dialog picker, writes nothing. */
export async function discoverLibrarySkillDirs(
  chainHomeInput: string | undefined,
  input: DiscoverSkillDirsInput
): Promise<DiscoverSkillDirsResult> {
  await withInitializedHub(chainHomeInput);
  return discoverGitSkills(input.repo);
}

/** SKILL.md-bearing directories inside a git-locked skill's source repo (for relink). */
export async function getLibrarySkillUpstreamDirs(chainHomeInput: string | undefined, name: string) {
  const chainHome = await withInitializedHub(chainHomeInput);
  return listSkillUpstreamDirs(chainHome, name);
}

/** Repoints a git-locked skill to a new subdir and reinstalls + re-projects it. */
export async function relinkLibrarySkill(
  chainHomeInput: string | undefined,
  name: string,
  subdir: string
): Promise<InstallSkillResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const result = await relinkSkill(chainHome, { name, subdir }, readSkillAsset);
  await syncAssetToEditors(chainHome, "skills", result.asset.name, result.asset);
  return result;
}

export async function getHubAgentsSkillsDrift(
  chainHomeInput?: string,
  lockPath?: string
): Promise<AgentsSkillsDrift> {
  const chainHome = await withInitializedHub(chainHomeInput);
  return detectAgentsSkillsDrift(chainHome, lockPath);
}
