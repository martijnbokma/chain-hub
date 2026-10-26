import {
  type InstallSkillResult,
  InvalidInputError,
  normalizeSkillName,
  NotFoundError,
  type SkillUpstreamDirsResult
} from "@chain-hub/contracts";

import { discoverGitSkillDirs } from "./skill-git.js";
import { installSkillFromSource } from "./skill-install.js";
import { type ReadAsset, readSkillsLock } from "./skills-lock.js";

/** Directories containing SKILL.md inside a git-locked skill's source repo; used to repair a stale subdir. */
export async function listSkillUpstreamDirs(chainHome: string, name: string): Promise<SkillUpstreamDirsResult> {
  const normalized = normalizeSkillName(name);
  const entry = (await readSkillsLock(chainHome)).skills[normalized];
  if (!entry) {
    throw new NotFoundError(`No lock entry for ${normalized}`);
  }
  if (entry.sourceType !== "git") {
    throw new InvalidInputError(`Skill ${normalized} is not installed from a git repo`);
  }

  const dirs = await discoverGitSkillDirs(entry.source);
  return { repo: entry.source, currentSubdir: entry.subdir ?? null, dirs };
}

/** Points an existing git-locked skill at another subdir in the same repo and reinstalls from it. */
export async function relinkSkill(
  chainHome: string,
  input: { name: string; subdir: string },
  readAsset: ReadAsset
): Promise<InstallSkillResult> {
  const name = normalizeSkillName(input.name);
  const entry = (await readSkillsLock(chainHome)).skills[name];
  if (!entry) {
    throw new NotFoundError(`No lock entry for ${name}`);
  }
  if (entry.sourceType !== "git") {
    throw new InvalidInputError(`Skill ${name} is not installed from a git repo`);
  }

  return installSkillFromSource(
    chainHome,
    { repo: entry.source, subdir: input.subdir, name, force: true },
    readAsset
  );
}
