import { promises as fs } from "node:fs";
import path from "node:path";

import {
  type AssetKind,
  type InstallRepoBundleInput,
  type InstallRepoBundleResult,
  normalizeSkillName
} from "@chain-hub/contracts";

import { cloneRepo, installAssetFromSource } from "./asset-install.js";
import { discoverGitSkills } from "./skill-git.js";
import { installSkillFromSource } from "./skill-install.js";
import type { ReadAsset } from "./skills-lock.js";
import type { SkillInstallSecurity } from "./security-gate.js";

// Plugin-bundle install: one repo carrying several assets in the conventional
// layout — skill dirs (any depth, discovered via SKILL.md) plus single-file
// assets under `agents/`, `workflows/`, `rules/`, `prompts/` at the root. Each
// item installs through its normal path so provenance, the security gate and
// lock entries stay identical to single installs. Per-item failures are
// collected, not fatal — a broken entry doesn't hold the rest of the bundle back.
const SINGLE_FILE_DIRS = ["agents", "workflows", "rules", "prompts"] as const;

export async function installRepoBundle(
  chainHome: string,
  input: InstallRepoBundleInput,
  readAsset: ReadAsset,
  security?: SkillInstallSecurity
): Promise<InstallRepoBundleResult> {
  const { hasRootSkill, dirs } = await discoverGitSkills(input.repo);

  // Enumerate conventional single-file asset dirs from one clone — the per-item
  // installs below re-clone for proper git provenance (update checks, lock entries).
  const files: Array<{ kind: Exclude<AssetKind, "skills">; name: string; dir: string }> = [];
  const cloned = await cloneRepo(input.repo);
  try {
    for (const dir of SINGLE_FILE_DIRS) {
      const dirPath = path.join(cloned.cleanupDir, dir);
      const entries = await fs.readdir(dirPath).catch(() => [] as string[]);
      for (const entry of entries) {
        if (entry.endsWith(".md")) {
          files.push({ kind: dir, name: entry.slice(0, -".md".length), dir });
        }
      }
    }
  } finally {
    await fs.rm(cloned.cleanupDir, { recursive: true, force: true });
  }

  const installed: InstallRepoBundleResult["installed"] = [];
  const failed: InstallRepoBundleResult["failed"] = [];

  const skills = hasRootSkill ? [{ subdir: ".", name: normalizeSkillName(path.basename(input.repo.replace(/\/$/, ""))) }] : [];
  skills.push(...dirs.map((dir) => ({ subdir: dir, name: normalizeSkillName(path.basename(dir)) })));

  for (const skill of skills) {
    try {
      await installSkillFromSource(
        chainHome,
        { repo: input.repo, subdir: skill.subdir, name: skill.name, force: input.force, allowUnsafe: input.allowUnsafe },
        readAsset,
        security
      );
      installed.push({ kind: "skills", name: skill.name });
    } catch (error) {
      failed.push({ id: `skills/${skill.name}`, kind: "skills", name: skill.name, error: error instanceof Error ? error.message : String(error) });
    }
  }

  for (const file of files) {
    try {
      await installAssetFromSource(chainHome, {
        kind: file.kind,
        repo: input.repo,
        subdir: file.dir,
        name: file.name,
        force: input.force,
        allowUnsafe: input.allowUnsafe,
        extraScanner: security?.extraScanner
      });
      installed.push({ kind: file.kind, name: file.name });
    } catch (error) {
      failed.push({ id: `${file.kind}/${file.name}`, kind: file.kind, name: file.name, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { installed, failed };
}
