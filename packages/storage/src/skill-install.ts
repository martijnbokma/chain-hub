import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertSafeRelativeSkillPath,
  type AssetDetail,
  ConflictError,
  type ForkSkillInput,
  type InstallSkillBundleInput,
  type InstallSkillInput,
  type InstallSkillResult,
  InvalidInputError,
  isUpstreamOwnedSkill,
  normalizeSkillName,
  NotFoundError,
  type SkillLockEntry
} from "@chain-hub/contracts";

import { pathExists } from "./shared.js";
import { copySkillTree, createSkillCopyFilter } from "./skill-copy.js";
import { resolveGitSkillDir } from "./skill-git.js";
import {
  mutateSkillsLock,
  type ReadAsset,
  readSkillsLock,
  recordSkillInstall,
  skillDir,
  skillFile
} from "./skills-lock.js";

/**
 * Hash of every file a skill install would copy (SKILL.md plus scripts/, references/, …),
 * so an update notices changes outside SKILL.md and skips sources that did not change.
 */
async function hashSkillTree(rootDir: string): Promise<string> {
  const filter = await createSkillCopyFilter(rootDir);
  const hash = createHash("sha1");

  async function walk(dir: string): Promise<void> {
    const entries = (await fs.readdir(dir)).sort();
    for (const name of entries) {
      const entryPath = path.join(dir, name);
      if (!(await filter(entryPath))) {
        continue;
      }
      const stats = await fs.stat(entryPath);
      if (stats.isDirectory()) {
        await walk(entryPath);
      } else if (stats.isFile()) {
        hash.update(path.relative(rootDir, entryPath).split(path.sep).join("/"));
        hash.update("\0");
        hash.update(await fs.readFile(entryPath));
        hash.update("\0");
      }
    }
  }

  await walk(rootDir);
  return hash.digest("hex");
}

async function assertSkillSource(sourceDir: string): Promise<void> {
  const skillMd = path.join(sourceDir, "SKILL.md");
  if (!(await pathExists(skillMd))) {
    throw new InvalidInputError(`No SKILL.md found in ${sourceDir}`);
  }

  const stats = await fs.stat(sourceDir);
  if (!stats.isDirectory()) {
    throw new InvalidInputError(`Skill source must be a directory: ${sourceDir}`);
  }
}

/** Normalizes the target name and refuses to replace an existing hub skill unless `force` is set. */
async function resolveInstallName(chainHome: string, rawName: string, force: boolean | undefined): Promise<string> {
  const name = normalizeSkillName(rawName);

  if (!name) {
    throw new InvalidInputError("Skill name cannot be empty");
  }

  if ((await pathExists(skillFile(chainHome, name))) && !force) {
    throw new ConflictError(`Skill already exists: skills/${name} (pass force to replace)`);
  }

  return name;
}

function isSkillMdPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized === "SKILL.md" || normalized.endsWith("/SKILL.md");
}

export async function installSkillFromBundle(
  chainHome: string,
  input: InstallSkillBundleInput,
  readAsset: ReadAsset
): Promise<InstallSkillResult> {
  const skillMdEntry = input.files.find((file) => isSkillMdPath(file.path));

  if (!skillMdEntry) {
    throw new InvalidInputError("Uploaded skill folder must include SKILL.md");
  }

  const inferredName = skillMdEntry.path.includes("/")
    ? path.posix.dirname(skillMdEntry.path.replace(/\\/g, "/")).split("/").filter(Boolean).at(-1)
    : undefined;

  const name = await resolveInstallName(chainHome, input.name ?? inferredName ?? "uploaded-skill", input.force);
  const destination = skillDir(chainHome, name);

  const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-upload-"));

  try {
    for (const file of input.files) {
      const relative = assertSafeRelativeSkillPath(file.path);
      const absolute = path.join(stagingDir, relative);
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, Buffer.from(file.contentBase64, "base64"));
    }

    let sourceDir = stagingDir;
    if (!(await pathExists(path.join(stagingDir, "SKILL.md")))) {
      const entries = await fs.readdir(stagingDir, { withFileTypes: true });
      const onlyDir = entries.length === 1 && entries[0]?.isDirectory() ? entries[0].name : null;
      if (onlyDir && (await pathExists(path.join(stagingDir, onlyDir, "SKILL.md")))) {
        sourceDir = path.join(stagingDir, onlyDir);
      } else {
        throw new InvalidInputError("Uploaded skill folder must include SKILL.md at the skill root");
      }
    }

    await copySkillTree(sourceDir, destination);

    const contentHash = await hashSkillTree(destination);
    const lockEntry = await recordSkillInstall(chainHome, name, () => ({
      sourceType: "path",
      source: `upload://${name}`,
      subdir: null,
      contentHash
    }));

    const asset = await readAsset(chainHome, "skills", name);
    return { asset, lockEntry };
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true });
  }
}

export async function installSkillFromSource(
  chainHome: string,
  input: InstallSkillInput,
  readAsset: ReadAsset
): Promise<InstallSkillResult> {
  const { unchanged: _unchanged, ...result } = await installSkillFromSourceUnlessUnchanged(chainHome, input, readAsset, null);
  return result;
}

/** Installs from a path or git source; with `knownHash`, leaves the hub copy alone when the source still matches it. */
export async function installSkillFromSourceUnlessUnchanged(
  chainHome: string,
  input: InstallSkillInput,
  readAsset: ReadAsset,
  knownHash: string | null
): Promise<InstallSkillResult & { unchanged: boolean }> {
  let cleanupDir: string | null = null;
  let sourceDir: string;
  let sourceType: SkillLockEntry["sourceType"];
  let source: string;
  let commitSha: string | null = null;
  let resolvedSubdir: string | null = input.subdir ?? null;

  try {
    if (input.path) {
      sourceDir = path.resolve(input.path);
      sourceType = "path";
      source = sourceDir;
      await assertSkillSource(sourceDir);
    } else if (input.repo) {
      const resolved = await resolveGitSkillDir(input.repo, input.subdir, input.name);
      cleanupDir = resolved.cleanupDir;
      sourceDir = resolved.sourceDir;
      commitSha = resolved.commitSha;
      // The dir SKILL.md was actually found in wins over a stale recorded subdir.
      if (resolved.detectedSubdir) {
        resolvedSubdir = resolved.detectedSubdir;
      }
      sourceType = "git";
      source = input.repo;
      await assertSkillSource(sourceDir);
    } else {
      throw new InvalidInputError("Provide exactly one of path or repo");
    }

    const name = await resolveInstallName(chainHome, input.name ?? path.basename(sourceDir), input.force);
    const destination = skillDir(chainHome, name);

    const contentHash = await hashSkillTree(sourceDir);
    const previousEntry = (await readSkillsLock(chainHome)).skills[name];
    if (knownHash && contentHash === knownHash && previousEntry) {
      if (commitSha && (previousEntry.commitSha !== commitSha || previousEntry.latestSha !== commitSha)) {
        const updatedEntry = await mutateSkillsLock(chainHome, (lockFile) => {
          const entry = lockFile.skills[name];
          if (entry) {
            entry.commitSha = commitSha;
            entry.latestSha = commitSha;
            entry.lastCheckedAt = new Date().toISOString();
          }
          return entry ?? previousEntry;
        });
        return { asset: await readAsset(chainHome, "skills", name), lockEntry: updatedEntry, unchanged: true };
      }
      return { asset: await readAsset(chainHome, "skills", name), lockEntry: previousEntry, unchanged: true };
    }

    await copySkillTree(sourceDir, destination);

    const lockEntry = await recordSkillInstall(chainHome, name, (previous, now) => ({
      sourceType,
      source,
      subdir: resolvedSubdir,
      contentHash,
      commitSha: commitSha ?? previous?.commitSha ?? null,
      latestSha: commitSha ?? null,
      lastCheckedAt: now
    }));

    const asset = await readAsset(chainHome, "skills", name);
    return { asset, lockEntry, unchanged: false };
  } finally {
    if (cleanupDir) {
      await fs.rm(cleanupDir, { recursive: true, force: true });
    }
  }
}

export async function forkSkillFromHub(
  chainHome: string,
  input: ForkSkillInput,
  readAsset: ReadAsset
): Promise<AssetDetail> {
  const sourceName = normalizeSkillName(input.name);
  if (!sourceName) {
    throw new InvalidInputError("Skill name cannot be empty");
  }

  if (!(await pathExists(skillFile(chainHome, sourceName)))) {
    throw new NotFoundError(`Skill not found: skills/${sourceName}`);
  }

  const lockFile = await readSkillsLock(chainHome);
  const entry = lockFile.skills[sourceName] ?? null;

  if (!isUpstreamOwnedSkill(entry)) {
    throw new ConflictError(`Skill is not upstream-owned (nothing to fork): ${sourceName}`);
  }

  const targetName = normalizeSkillName(input.as ?? `${sourceName}-local`);
  if (!targetName) {
    throw new InvalidInputError("Fork name cannot be empty");
  }

  if (targetName === sourceName) {
    throw new ConflictError("Fork name must differ from the upstream skill name");
  }

  if (await pathExists(skillFile(chainHome, targetName))) {
    throw new ConflictError(`Skill already exists: skills/${targetName}`);
  }

  await copySkillTree(skillDir(chainHome, sourceName), skillDir(chainHome, targetName));

  if (lockFile.skills[targetName]) {
    await mutateSkillsLock(chainHome, (current) => {
      delete current.skills[targetName];
    });
  }

  return readAsset(chainHome, "skills", targetName);
}
