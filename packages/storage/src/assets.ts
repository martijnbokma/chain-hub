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

import { getAsset, initializeHub, resolveChainHome } from "./core.js";
import {
  detectAgentsSkillsDrift,
  forkSkillFromHub,
  installSkillFromBundle,
  installSkillFromSource,
  migrateAgentsSkillLock,
  updateSkillsFromLock
} from "./skill-install.js";

export async function installSkill(
  chainHomeInput: string | undefined,
  input: InstallSkillInput
): Promise<InstallSkillResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  return installSkillFromSource(chainHome, input, async (home, kind, name) => getAsset(home, kind, name));
}

export async function installSkillBundle(
  chainHomeInput: string | undefined,
  input: InstallSkillBundleInput
): Promise<InstallSkillResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  return installSkillFromBundle(chainHome, input, async (home, kind, name) => getAsset(home, kind, name));
}

export async function updateSkills(
  chainHomeInput: string | undefined,
  input: UpdateSkillsInput = {}
): Promise<UpdateSkillsResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  return updateSkillsFromLock(chainHome, input, async (home, kind, name) => getAsset(home, kind, name));
}

export async function migrateAgentsSkills(
  chainHomeInput: string | undefined,
  input: MigrateAgentsSkillsInput = {}
): Promise<MigrateAgentsSkillsResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  return migrateAgentsSkillLock(chainHome, input, async (home, kind, name) => getAsset(home, kind, name));
}

export async function getAgentsSkillsDrift(
  chainHomeInput?: string,
  lockPath?: string
): Promise<AgentsSkillsDrift> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  return detectAgentsSkillsDrift(chainHome, lockPath);
}

export async function forkSkill(
  chainHomeInput: string | undefined,
  input: ForkSkillInput
): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  return forkSkillFromHub(chainHome, input, async (home, kind, name) => getAsset(home, kind, name));
}
