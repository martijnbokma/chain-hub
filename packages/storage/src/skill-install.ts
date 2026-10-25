import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  type AgentsSkillsDrift,
  assertSafeRelativeSkillPath,
  type AssetDetail,
  type CheckSkillUpdatesInput,
  type CheckSkillUpdatesResult,
  ConflictError,
  type ForkSkillInput,
  hasSkillUpdate,
  type InstallSkillBundleInput,
  type InstallSkillInput,
  type InstallSkillResult,
  InvalidInputError,
  isUpstreamOwnedSkill,
  type MigrateAgentsSkillsInput,
  type MigrateAgentsSkillsResult,
  normalizeSkillName,
  NotFoundError,
  type SkillBatchItemResult,
  type SkillCheckItemResult,
  type SkillLockEntry,
  type SkillsLockFile,
  subdirFromSkillPath,
  type UpdateSkillsInput,
  type UpdateSkillsResult
} from "@chain-hub/contracts";

import { mutateInstallLock, readInstallLock } from "./install-lock.js";
import { pathExists } from "./shared.js";
import { copySkillTree, createSkillCopyFilter } from "./skill-copy.js";
import { fetchRemoteHeadSha, resolveGitSkillDir } from "./skill-git.js";

interface AgentsLockEntry {
  sourceType?: string;
  sourceUrl?: string;
  skillPath?: string;
  source?: string;
}

interface AgentsLockFile {
  version?: number;
  skills?: Record<string, AgentsLockEntry>;
}

type ReadAsset = (chainHome: string, kind: "skills", name: string) => Promise<AssetDetail>;

function skillDir(chainHome: string, name: string): string {
  return path.join(chainHome, "skills", name);
}

function skillFile(chainHome: string, name: string): string {
  return path.join(skillDir(chainHome, name), "SKILL.md");
}

/** Prefix of lock files set aside because they could not be read; `chain validate` reports them. */
export const CORRUPT_LOCK_PREFIX = "skills-lock.json.corrupt-";

/**
 * Legacy skills-view over the unified `assets-lock.json` (D2, docs/specs/hub-catalog.md).
 * The old `skills-lock.json` is migrated in once by readInstallLock and ignored after.
 */
export async function readSkillsLock(chainHome: string): Promise<SkillsLockFile> {
  const lock = await readInstallLock(chainHome);
  const skills: SkillsLockFile["skills"] = {};
  for (const [key, entry] of Object.entries(lock.entries)) {
    if (key.startsWith("skills/")) {
      skills[key.slice("skills/".length)] = entry;
    }
  }
  return { version: 1, skills };
}

/**
 * Read-modify-write of the skills slice of assets-lock.json, one at a time within
 * this process, so parallel installs (bulk import, dashboard + CLI server) never
 * drop each other's entries.
 */
function mutateSkillsLock<T>(chainHome: string, mutate: (lockFile: SkillsLockFile) => T | Promise<T>): Promise<T> {
  return mutateInstallLock(chainHome, async (lockFile) => {
    const skills: SkillsLockFile["skills"] = {};
    for (const [key, entry] of Object.entries(lockFile.entries)) {
      if (key.startsWith("skills/")) {
        skills[key.slice("skills/".length)] = entry;
      }
    }

    const result = await mutate({ version: 1, skills });

    for (const key of Object.keys(lockFile.entries)) {
      if (key.startsWith("skills/")) {
        delete lockFile.entries[key];
      }
    }
    for (const [name, entry] of Object.entries(skills)) {
      lockFile.entries[`skills/${name}`] = entry;
    }
    return result;
  });
}

/** Move a skills.lock entry when a hub skill directory is renamed. */
export async function renameSkillLockEntry(
  chainHome: string,
  fromName: string,
  toName: string
): Promise<void> {
  await mutateSkillsLock(chainHome, (lockFile) => {
    const entry = lockFile.skills[fromName];
    if (!entry) {
      return;
    }
    if (lockFile.skills[toName]) {
      throw new ConflictError(`Skill lock already has an entry for ${toName}`);
    }
    delete lockFile.skills[fromName];
    lockFile.skills[toName] = entry;
  });
}

/** Drop a skills.lock entry when a skill leaves the skills kind (convert/delete). */
export async function removeSkillLockEntry(chainHome: string, name: string): Promise<void> {
  if (!(await readSkillsLock(chainHome)).skills[name]) {
    return;
  }
  await mutateSkillsLock(chainHome, (lockFile) => {
    delete lockFile.skills[name];
  });
}

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

/** Writes the lock entry for a fresh install, keeping the original `installedAt` on reinstalls. */
function recordSkillInstall(
  chainHome: string,
  name: string,
  fields: (previous: SkillLockEntry | undefined, now: string) => Omit<SkillLockEntry, "installedAt" | "updatedAt">
): Promise<SkillLockEntry> {
  const now = new Date().toISOString();
  return mutateSkillsLock(chainHome, (lockFile) => {
    const previous = lockFile.skills[name];
    const entry: SkillLockEntry = { ...fields(previous, now), installedAt: previous?.installedAt ?? now, updatedAt: now };
    lockFile.skills[name] = entry;
    return entry;
  });
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
async function installSkillFromSourceUnlessUnchanged(
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
      if (!input.subdir && resolved.detectedSubdir) {
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

export async function updateSkillsFromLock(
  chainHome: string,
  input: UpdateSkillsInput,
  readAsset: ReadAsset
): Promise<UpdateSkillsResult> {
  const lockFile = await readSkillsLock(chainHome);
  const names = input.name ? [normalizeSkillName(input.name)] : Object.keys(lockFile.skills).sort();
  const results: SkillBatchItemResult[] = [];

  for (const name of names) {
    const entry = lockFile.skills[name];

    if (!entry) {
      results.push({ name, status: "failed", error: `No lock entry for ${name}` });
      continue;
    }

    try {
      if (entry.sourceType === "path" && !(await pathExists(path.join(entry.source, "SKILL.md")))) {
        throw new NotFoundError(`Source path missing SKILL.md: ${entry.source}`);
      }

      const installed = await installSkillFromSourceUnlessUnchanged(
        chainHome,
        {
          path: entry.sourceType === "path" ? entry.source : undefined,
          repo: entry.sourceType === "git" ? entry.source : undefined,
          subdir: entry.subdir ?? undefined,
          name,
          force: true
        },
        readAsset,
        input.force ? null : (entry.contentHash ?? null)
      );

      results.push({
        name,
        status: installed.unchanged ? "skipped" : "updated",
        previousCommitSha: entry.commitSha ?? null,
        lockEntry: installed.lockEntry
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name, status: "failed", previousCommitSha: entry.commitSha ?? null, error: message });
    }
  }

  return { results };
}

/** Re-probe remotes at most this often; `force` bypasses the window. */
export const SKILL_UPDATE_CHECK_TTL_MS = 15 * 60 * 1000;

export async function checkSkillUpdatesFromLock(
  chainHome: string,
  input: CheckSkillUpdatesInput = {}
): Promise<CheckSkillUpdatesResult> {
  const lockFile = await readSkillsLock(chainHome);
  const now = new Date().toISOString();
  const freshSince = Date.now() - SKILL_UPDATE_CHECK_TTL_MS;
  const results: SkillCheckItemResult[] = [];

  const gitReposToSkills = new Map<string, Array<{ name: string; entry: SkillLockEntry }>>();

  for (const [name, entry] of Object.entries(lockFile.skills)) {
    if (entry.sourceType !== "git") {
      results.push({
        name,
        status: "not_applicable",
        source: entry.source
      });
      continue;
    }

    const checkedAt = entry.lastCheckedAt ? Date.parse(entry.lastCheckedAt) : Number.NaN;
    if (!input.force && entry.latestSha && Number.isFinite(checkedAt) && checkedAt >= freshSince) {
      results.push({
        name,
        status: hasSkillUpdate(entry) ? "update_available" : "up_to_date",
        source: entry.source,
        currentSha: entry.commitSha ?? null,
        latestSha: entry.latestSha
      });
      continue;
    }

    const list = gitReposToSkills.get(entry.source) ?? [];
    list.push({ name, entry });
    gitReposToSkills.set(entry.source, list);
  }

  const repoRemoteShaMap = new Map<string, { sha?: string; error?: string }>();

  await Promise.all(
    Array.from(gitReposToSkills.keys()).map(async (repo) => {
      try {
        const headSha = await fetchRemoteHeadSha(repo);
        repoRemoteShaMap.set(repo, { sha: headSha ?? undefined });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        repoRemoteShaMap.set(repo, { error: message });
      }
    })
  );

  const skillsToUpdateInLock: Array<{ name: string; latestSha: string; lastCheckedAt: string }> = [];

  for (const [repo, skillList] of gitReposToSkills.entries()) {
    const probe = repoRemoteShaMap.get(repo);

    for (const { name, entry } of skillList) {
      if (probe?.error) {
        results.push({
          name,
          status: "failed",
          source: repo,
          currentSha: entry.commitSha ?? null,
          error: probe.error
        });
        continue;
      }

      const latestSha = probe?.sha;
      if (!latestSha) {
        results.push({
          name,
          status: "failed",
          source: repo,
          currentSha: entry.commitSha ?? null,
          error: "Could not resolve remote HEAD commit"
        });
        continue;
      }

      skillsToUpdateInLock.push({ name, latestSha, lastCheckedAt: now });

      if (entry.commitSha && entry.commitSha === latestSha) {
        results.push({
          name,
          status: "up_to_date",
          source: repo,
          currentSha: entry.commitSha,
          latestSha
        });
      } else {
        results.push({
          name,
          status: "update_available",
          source: repo,
          currentSha: entry.commitSha ?? null,
          latestSha
        });
      }
    }
  }

  if (skillsToUpdateInLock.length > 0) {
    await mutateSkillsLock(chainHome, (currentLock) => {
      for (const item of skillsToUpdateInLock) {
        if (currentLock.skills[item.name]) {
          currentLock.skills[item.name]!.latestSha = item.latestSha;
          currentLock.skills[item.name]!.lastCheckedAt = item.lastCheckedAt;
        }
      }
    }).catch(() => undefined);
  }

  results.sort((a, b) => a.name.localeCompare(b.name));

  return {
    results,
    checkedAt: now
  };
}

export async function detectAgentsSkillsDrift(
  chainHome: string,
  lockPathInput?: string
): Promise<AgentsSkillsDrift> {
  const lockPath = path.resolve(lockPathInput ?? path.join(os.homedir(), ".agents", ".skill-lock.json"));

  if (!(await pathExists(lockPath))) {
    return { lockPath: null, missingNames: [], missingCount: 0 };
  }

  let parsed: AgentsLockFile;
  try {
    const raw = await fs.readFile(lockPath, "utf8");
    parsed = JSON.parse(raw) as AgentsLockFile;
  } catch {
    return { lockPath, missingNames: [], missingCount: 0 };
  }

  const missingNames: string[] = [];
  for (const rawName of Object.keys(parsed.skills ?? {})) {
    const name = normalizeSkillName(rawName);
    if (!(await pathExists(skillFile(chainHome, name)))) {
      missingNames.push(name);
    }
  }

  missingNames.sort();
  return { lockPath, missingNames, missingCount: missingNames.length };
}

export async function migrateAgentsSkillLock(
  chainHome: string,
  input: MigrateAgentsSkillsInput,
  readAsset: ReadAsset
): Promise<MigrateAgentsSkillsResult> {
  const lockPath = path.resolve(input.lockPath ?? path.join(os.homedir(), ".agents", ".skill-lock.json"));

  if (!(await pathExists(lockPath))) {
    throw new NotFoundError(`Agents skill lock not found: ${lockPath}`);
  }

  const raw = await fs.readFile(lockPath, "utf8");
  const parsed = JSON.parse(raw) as AgentsLockFile;
  const entries = parsed.skills ?? {};
  const results: SkillBatchItemResult[] = [];

  for (const [rawName, entry] of Object.entries(entries)) {
    const name = normalizeSkillName(rawName);
    const repo = entry.sourceUrl ?? (entry.source?.includes("://") ? entry.source : undefined);

    if (!repo) {
      results.push({
        name,
        status: "failed",
        error: "Lock entry has no sourceUrl (or git source)"
      });
      continue;
    }

    const hubSkillExists = await pathExists(skillFile(chainHome, name));
    if (hubSkillExists && !input.force) {
      results.push({ name, status: "skipped" });
      continue;
    }

    try {
      const installed = await installSkillFromSource(
        chainHome,
        {
          repo,
          subdir: subdirFromSkillPath(entry.skillPath),
          name,
          force: Boolean(input.force) || hubSkillExists
        },
        readAsset
      );
      results.push({ name, status: "migrated", lockEntry: installed.lockEntry });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name, status: "failed", error: message });
    }
  }

  return { lockPath, results };
}
