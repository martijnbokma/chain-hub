import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  type AgentsSkillsDrift,
  assertSafeRelativeSkillPath,
  type AssetDetail,
  ConflictError,
  type ForkSkillInput,
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
  type SkillLockEntry,
  type SkillsLockFile,
  subdirFromSkillPath,
  type UpdateSkillsInput,
  type UpdateSkillsResult
} from "@chain-hub/contracts";

import { writeFileAtomic } from "./shared.js";

const execFileAsync = promisify(execFile);

const GIT_CLONE_TIMEOUT_MS = 120_000;

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

function skillsLockPath(chainHome: string): string {
  return path.join(chainHome, "system", "skills-lock.json");
}

function skillDir(chainHome: string, name: string): string {
  return path.join(chainHome, "skills", name);
}

function skillFile(chainHome: string, name: string): string {
  return path.join(skillDir(chainHome, name), "SKILL.md");
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.lstat(target);
    return true;
  } catch {
    return false;
  }
}

export async function readSkillsLock(chainHome: string): Promise<SkillsLockFile> {
  try {
    const raw = await fs.readFile(skillsLockPath(chainHome), "utf8");
    const parsed = JSON.parse(raw) as SkillsLockFile;
    if (parsed.version !== 1 || typeof parsed.skills !== "object" || parsed.skills === null) {
      return { version: 1, skills: {} };
    }
    return parsed;
  } catch {
    return { version: 1, skills: {} };
  }
}

async function writeSkillsLock(chainHome: string, lockFile: SkillsLockFile): Promise<void> {
  await fs.mkdir(path.dirname(skillsLockPath(chainHome)), { recursive: true });
  await writeFileAtomic(skillsLockPath(chainHome), `${JSON.stringify(lockFile, null, 2)}\n`);
}

let lockQueue: Promise<unknown> = Promise.resolve();

/**
 * Read-modify-write of skills-lock.json, one at a time within this process, so
 * parallel installs (bulk import, dashboard + CLI server) never drop each other's entries.
 */
function mutateSkillsLock<T>(chainHome: string, mutate: (lockFile: SkillsLockFile) => T | Promise<T>): Promise<T> {
  const run = lockQueue.then(async () => {
    const lockFile = await readSkillsLock(chainHome);
    const result = await mutate(lockFile);
    await writeSkillsLock(chainHome, lockFile);
    return result;
  });
  lockQueue = run.catch(() => undefined);
  return run;
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

/** Version-control folders never belong in an installed skill (or in every editor it is projected to). */
const SKIPPED_SKILL_ENTRIES = new Set([".git", ".hg", ".svn"]);

function isInside(parent: string, target: string): boolean {
  return target === parent || target.startsWith(parent + path.sep);
}

/**
 * Copy filter for untrusted skill sources. Symlinks are only followed when they point
 * to a regular file inside the skill folder; anything else (links to ~/.ssh, /etc,
 * directories that could loop) is skipped so it cannot leak into the hub or editors.
 */
async function createSkillCopyFilter(sourceDir: string): Promise<(source: string) => Promise<boolean>> {
  const realRoot = await fs.realpath(sourceDir);

  return async (source: string) => {
    if (SKIPPED_SKILL_ENTRIES.has(path.basename(source))) {
      return false;
    }

    const stats = await fs.lstat(source);
    if (!stats.isSymbolicLink()) {
      return true;
    }

    try {
      const target = await fs.realpath(source);
      if (isInside(realRoot, target) && (await fs.stat(target)).isFile()) {
        return true;
      }
    } catch {
      // Dangling link.
    }

    console.warn(`[chain-hub] skipping symlink in skill source: ${source}`);
    return false;
  };
}

/** Copies a skill folder's files other than SKILL.md (scripts/, references/, …) with the same safety filter as installs. */
export async function copySkillSidecars(sourceDir: string, destinationDir: string): Promise<void> {
  const filter = await createSkillCopyFilter(sourceDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "SKILL.md" || entry.name === "skill.md") {
      continue;
    }

    const from = path.join(sourceDir, entry.name);
    if (!(await filter(from))) {
      continue;
    }

    await fs.cp(from, path.join(destinationDir, entry.name), { recursive: true, dereference: true, filter });
  }
}

/** Copies into a staging sibling first so a failed copy never destroys the installed skill. */
async function copySkillTree(sourceDir: string, destinationDir: string): Promise<void> {
  await fs.mkdir(path.dirname(destinationDir), { recursive: true });
  const stagingDir = `${destinationDir}.staging-${process.pid}-${Date.now()}`;

  try {
    await fs.cp(sourceDir, stagingDir, {
      recursive: true,
      dereference: true,
      filter: await createSkillCopyFilter(sourceDir)
    });
    await fs.rm(destinationDir, { recursive: true, force: true });
    await fs.rename(stagingDir, destinationDir);
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true });
  }
}

async function resolveGitSkillDir(repo: string, subdir: string | undefined, nameHint: string | undefined): Promise<{
  cleanupDir: string;
  sourceDir: string;
}> {
  const cleanupDir = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-clone-"));

  try {
    // `--` stops a repo value like `--upload-pack=…` from being parsed as an option.
    await execFileAsync("git", ["clone", "--depth", "1", "--", repo, cleanupDir], {
      // Never block the server on an interactive credential prompt.
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      timeout: GIT_CLONE_TIMEOUT_MS
    });
  } catch (error) {
    await fs.rm(cleanupDir, { recursive: true, force: true });
    const message = error instanceof Error ? error.message : String(error);
    throw new InvalidInputError(`Failed to clone skill repo ${repo}: ${message}`);
  }

  const candidates: string[] = [];

  if (subdir) {
    candidates.push(path.join(cleanupDir, assertSafeRelativeSkillPath(subdir)));
  }

  candidates.push(cleanupDir);

  const safeNameHint = nameHint ? normalizeSkillName(nameHint) : "";
  if (safeNameHint) {
    candidates.push(path.join(cleanupDir, safeNameHint));
    candidates.push(path.join(cleanupDir, "skills", safeNameHint));
  }

  for (const candidate of candidates) {
    if (await pathExists(path.join(candidate, "SKILL.md"))) {
      return { cleanupDir, sourceDir: candidate };
    }
  }

  await fs.rm(cleanupDir, { recursive: true, force: true });
  throw new InvalidInputError(
    `No SKILL.md found in cloned repo${subdir ? ` at subdir ${subdir}` : ""}. Pass --subdir to the skill folder.`
  );
}

export async function installSkillFromBundle(
  chainHome: string,
  input: InstallSkillBundleInput,
  readAsset: ReadAsset
): Promise<InstallSkillResult> {
  const hasSkillMd = input.files.some((file) => {
    const normalized = file.path.replace(/\\/g, "/");
    return normalized === "SKILL.md" || normalized.endsWith("/SKILL.md");
  });

  if (!hasSkillMd) {
    throw new InvalidInputError("Uploaded skill folder must include SKILL.md");
  }

  const skillMdEntry = input.files.find((file) => {
    const normalized = file.path.replace(/\\/g, "/");
    return normalized === "SKILL.md" || normalized.endsWith("/SKILL.md");
  });

  const inferredName =
    skillMdEntry && skillMdEntry.path.includes("/")
      ? path.posix.dirname(skillMdEntry.path.replace(/\\/g, "/")).split("/").filter(Boolean).at(-1)
      : undefined;

  const name = normalizeSkillName(input.name ?? inferredName ?? "uploaded-skill");

  if (!name) {
    throw new InvalidInputError("Skill name cannot be empty");
  }

  const destination = skillDir(chainHome, name);

  if ((await pathExists(skillFile(chainHome, name))) && !input.force) {
    throw new ConflictError(`Skill already exists: skills/${name} (pass force to replace)`);
  }

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

    const now = new Date().toISOString();
    const contentHash = await hashSkillTree(destination);
    const lockEntry = await mutateSkillsLock(chainHome, (lockFile) => {
      const entry: SkillLockEntry = {
        sourceType: "path",
        source: `upload://${name}`,
        subdir: null,
        contentHash,
        installedAt: lockFile.skills[name]?.installedAt ?? now,
        updatedAt: now
      };
      lockFile.skills[name] = entry;
      return entry;
    });

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
  const subdir: string | null = input.subdir ?? null;

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
      sourceType = "git";
      source = input.repo;
      await assertSkillSource(sourceDir);
    } else {
      throw new InvalidInputError("Provide exactly one of path or repo");
    }

    const folderName = path.basename(sourceDir);
    const name = normalizeSkillName(input.name ?? folderName);

    if (!name) {
      throw new InvalidInputError("Skill name cannot be empty");
    }

    const destination = skillDir(chainHome, name);

    if ((await pathExists(skillFile(chainHome, name))) && !input.force) {
      throw new ConflictError(`Skill already exists: skills/${name} (pass force to replace)`);
    }

    const contentHash = await hashSkillTree(sourceDir);
    const previousEntry = (await readSkillsLock(chainHome)).skills[name];
    if (knownHash && contentHash === knownHash && previousEntry) {
      return { asset: await readAsset(chainHome, "skills", name), lockEntry: previousEntry, unchanged: true };
    }

    await copySkillTree(sourceDir, destination);

    const now = new Date().toISOString();
    const lockEntry = await mutateSkillsLock(chainHome, (lockFile) => {
      const entry: SkillLockEntry = {
        sourceType,
        source,
        subdir,
        contentHash,
        installedAt: lockFile.skills[name]?.installedAt ?? now,
        updatedAt: now
      };
      lockFile.skills[name] = entry;
      return entry;
    });

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

      results.push({ name, status: installed.unchanged ? "skipped" : "updated", lockEntry: installed.lockEntry });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name, status: "failed", error: message });
    }
  }

  return { results };
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

async function resolveEditorSkillDir(editorSkillDir: string): Promise<string> {
  if (!(await pathExists(editorSkillDir))) {
    return editorSkillDir;
  }

  try {
    return await fs.realpath(editorSkillDir);
  } catch {
    return editorSkillDir;
  }
}

async function copySidecarEntry(from: string, to: string): Promise<void> {
  await fs.rm(to, { recursive: true, force: true });

  try {
    await fs.cp(from, to, { recursive: true });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code !== "EEXIST") {
      throw error;
    }

    await fs.rm(to, { recursive: true, force: true });
    await fs.cp(from, to, { recursive: true });
  }
}

export async function projectSkillSidecars(chainHome: string, editorSkillDir: string, name: string): Promise<void> {
  const sourceDir = skillDir(chainHome, name);

  if (!(await pathExists(sourceDir))) {
    return;
  }

  const resolvedEditorSkillDir = await resolveEditorSkillDir(editorSkillDir);
  await fs.mkdir(resolvedEditorSkillDir, { recursive: true });

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "SKILL.md" || entry.name === "skill.md") {
      continue;
    }

    const from = path.join(sourceDir, entry.name);
    const to = path.join(resolvedEditorSkillDir, entry.name);
    await copySidecarEntry(from, to);
  }
}

export async function removeEditorSkillDirectory(editorSkillDir: string): Promise<void> {
  await fs.rm(editorSkillDir, { recursive: true, force: true });
}
