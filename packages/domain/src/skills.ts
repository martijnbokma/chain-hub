import type {
  AgentsSkillsDrift,
  AssetDetail,
  CheckSkillUpdatesInput,
  CheckSkillUpdatesResult,
  ForkSkillInput,
  InstallSkillBundleInput,
  InstallSkillInput,
  InstallSkillResult,
  MigrateAgentsSkillsInput,
  MigrateAgentsSkillsResult,
  SkillBatchItemResult,
  UpdateSkillsInput,
  UpdateSkillsResult
} from "@chain-hub/contracts";
import {
  checkSkillUpdatesFromLock,
  detectAgentsSkillsDrift,
  forkHubAsset,
  forkSkillFromHub,
  getAsset,
  initializeHub,
  installSkillFromBundle,
  installSkillFromSource,
  listSkillUpstreamDirs,
  migrateAgentsSkillLock,
  relinkSkill,
  removeSkillLockEntry,
  resolveChainHome,
  syncAssetToEditors,
  updateSkillsFromLock
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
  const result = await installSkillFromSource(chainHome, input, readSkillAsset);
  await syncAssetToEditors(chainHome, "skills", result.asset.name, result.asset);
  return result;
}

export async function installLibrarySkillBundle(
  chainHomeInput: string | undefined,
  input: InstallSkillBundleInput
): Promise<InstallSkillResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const result = await installSkillFromBundle(chainHome, input, readSkillAsset);
  await syncAssetToEditors(chainHome, "skills", result.asset.name, result.asset);
  return result;
}

export async function updateLibrarySkills(
  chainHomeInput: string | undefined,
  input: UpdateSkillsInput = {}
): Promise<UpdateSkillsResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const result = await updateSkillsFromLock(chainHome, input, readSkillAsset);

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
  const result = await migrateAgentsSkillLock(chainHome, input, readSkillAsset);

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

/** Drops the lock entry: the skill stays in the hub and becomes hub-editable. */
export async function unlinkLibrarySkill(chainHomeInput: string | undefined, name: string): Promise<{ ok: true }> {
  const chainHome = await withInitializedHub(chainHomeInput);
  await removeSkillLockEntry(chainHome, name);
  return { ok: true };
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
