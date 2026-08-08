import type {
  AgentsSkillsDrift,
  AssetDetail,
  ForkSkillInput,
  InstallSkillBundleInput,
  InstallSkillInput,
  InstallSkillResult,
  MigrateAgentsSkillsInput,
  MigrateAgentsSkillsResult,
  UpdateSkillsInput,
  UpdateSkillsResult
} from "@chain-hub/contracts";
import {
  detectAgentsSkillsDrift,
  forkSkillFromHub,
  getAsset,
  initializeHub,
  installSkillFromBundle,
  installSkillFromSource,
  migrateAgentsSkillLock,
  resolveChainHome,
  syncAssetToEditors,
  updateSkillsFromLock,
  syncAssetIndex
} from "@chain-hub/storage";

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

export async function installLibrarySkill(
  chainHomeInput: string | undefined,
  input: InstallSkillInput
): Promise<InstallSkillResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const result = await installSkillFromSource(chainHome, input, readSkillAsset, syncAssetIndex);
  await syncAssetToEditors(chainHome, "skills", result.asset.name, result.asset);
  return result;
}

export async function installLibrarySkillBundle(
  chainHomeInput: string | undefined,
  input: InstallSkillBundleInput
): Promise<InstallSkillResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const result = await installSkillFromBundle(chainHome, input, readSkillAsset, syncAssetIndex);
  await syncAssetToEditors(chainHome, "skills", result.asset.name, result.asset);
  return result;
}

export async function updateLibrarySkills(
  chainHomeInput: string | undefined,
  input: UpdateSkillsInput = {}
): Promise<UpdateSkillsResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const result = await updateSkillsFromLock(chainHome, input, readSkillAsset, syncAssetIndex);

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
  chainHomeInput: string | undefined,
  input: MigrateAgentsSkillsInput = {}
): Promise<MigrateAgentsSkillsResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const result = await migrateAgentsSkillLock(chainHome, input, readSkillAsset, syncAssetIndex);

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
  const asset = await forkSkillFromHub(chainHome, input, readSkillAsset, syncAssetIndex);
  await syncAssetToEditors(chainHome, "skills", asset.name, asset);
  return asset;
}

export async function getHubAgentsSkillsDrift(
  chainHomeInput?: string,
  lockPath?: string
): Promise<AgentsSkillsDrift> {
  const chainHome = await withInitializedHub(chainHomeInput);
  return detectAgentsSkillsDrift(chainHome, lockPath);
}
