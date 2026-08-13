import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  assertSafeRelativeSkillPath,
  isUpstreamOwnedSkill,
  normalizeSkillName,
  subdirFromSkillPath,
  type AgentsSkillsDrift,
  type AssetDetail,
  type ForkSkillInput,
  type InstallSkillBundleInput,
  type InstallSkillInput,
  type InstallSkillResult,
  type MigrateAgentsSkillsInput,
  type MigrateAgentsSkillsResult,
  type SkillBatchItemResult,
  type SkillLockEntry,
  type SkillsLockFile,
  type UpdateSkillsInput,
  type UpdateSkillsResult
} from "@chain-hub/contracts";

const execFileAsync = promisify(execFile);

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
type SyncIndex = (chainHome: string) => Promise<void>;

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
  await fs.writeFile(skillsLockPath(chainHome), `${JSON.stringify(lockFile, null, 2)}\n`, "utf8");
}

/** Move a skills.lock entry when a hub skill directory is renamed. */
export async function renameSkillLockEntry(
  chainHome: string,
  fromName: string,
  toName: string
): Promise<void> {
  const lockFile = await readSkillsLock(chainHome);
  const entry = lockFile.skills[fromName];
  if (!entry) {
    return;
  }
  if (lockFile.skills[toName]) {
    throw new Error(`Skill lock already has an entry for ${toName}`);
  }
  delete lockFile.skills[fromName];
  lockFile.skills[toName] = entry;
  await writeSkillsLock(chainHome, lockFile);
}

/** Drop a skills.lock entry when a skill leaves the skills kind (convert/delete). */
export async function removeSkillLockEntry(chainHome: string, name: string): Promise<void> {
  const lockFile = await readSkillsLock(chainHome);
  if (!lockFile.skills[name]) {
    return;
  }
  delete lockFile.skills[name];
  await writeSkillsLock(chainHome, lockFile);
}

async function hashSkillMarkdown(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, "utf8");
  return createHash("sha1").update(content).digest("hex");
}

async function assertSkillSource(sourceDir: string): Promise<void> {
  const skillMd = path.join(sourceDir, "SKILL.md");
  if (!(await pathExists(skillMd))) {
    throw new Error(`No SKILL.md found in ${sourceDir}`);
  }

  const stats = await fs.stat(sourceDir);
  if (!stats.isDirectory()) {
    throw new Error(`Skill source must be a directory: ${sourceDir}`);
  }
}

async function copySkillTree(sourceDir: string, destinationDir: string): Promise<void> {
  await fs.rm(destinationDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(destinationDir), { recursive: true });
  await fs.cp(sourceDir, destinationDir, { recursive: true });
}

async function resolveGitSkillDir(repo: string, subdir: string | undefined, nameHint: string | undefined): Promise<{
  cleanupDir: string;
  sourceDir: string;
}> {
  const cleanupDir = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-clone-"));

  try {
    await execFileAsync("git", ["clone", "--depth", "1", repo, cleanupDir], {
      env: process.env
    });
  } catch (error) {
    await fs.rm(cleanupDir, { recursive: true, force: true });
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clone skill repo ${repo}: ${message}`);
  }

  const candidates: string[] = [];

  if (subdir) {
    candidates.push(path.join(cleanupDir, subdir));
  }

  candidates.push(cleanupDir);

  if (nameHint) {
    candidates.push(path.join(cleanupDir, nameHint));
    candidates.push(path.join(cleanupDir, "skills", nameHint));
  }

  for (const candidate of candidates) {
    if (await pathExists(path.join(candidate, "SKILL.md"))) {
      return { cleanupDir, sourceDir: candidate };
    }
  }

  await fs.rm(cleanupDir, { recursive: true, force: true });
  throw new Error(
    `No SKILL.md found in cloned repo${subdir ? ` at subdir ${subdir}` : ""}. Pass --subdir to the skill folder.`
  );
}

export async function installSkillFromBundle(
  chainHome: string,
  input: InstallSkillBundleInput,
  readAsset: ReadAsset,
  syncIndex: SyncIndex
): Promise<InstallSkillResult> {
  const hasSkillMd = input.files.some((file) => {
    const normalized = file.path.replace(/\\/g, "/");
    return normalized === "SKILL.md" || normalized.endsWith("/SKILL.md");
  });

  if (!hasSkillMd) {
    throw new Error("Uploaded skill folder must include SKILL.md");
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
    throw new Error("Skill name cannot be empty");
  }

  const destination = skillDir(chainHome, name);

  if ((await pathExists(skillFile(chainHome, name))) && !input.force) {
    throw new Error(`Skill already exists: skills/${name} (pass force to replace)`);
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
        throw new Error("Uploaded skill folder must include SKILL.md at the skill root");
      }
    }

    await copySkillTree(sourceDir, destination);
    await syncIndex(chainHome);

    const now = new Date().toISOString();
    const lockFile = await readSkillsLock(chainHome);
    const previous = lockFile.skills[name];
    const contentHash = await hashSkillMarkdown(skillFile(chainHome, name));
    const lockEntry: SkillLockEntry = {
      sourceType: "path",
      source: `upload://${name}`,
      subdir: null,
      contentHash,
      installedAt: previous?.installedAt ?? now,
      updatedAt: now
    };
    lockFile.skills[name] = lockEntry;
    await writeSkillsLock(chainHome, lockFile);

    const asset = await readAsset(chainHome, "skills", name);
    return { asset, lockEntry };
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true });
  }
}

export async function installSkillFromSource(
  chainHome: string,
  input: InstallSkillInput,
  readAsset: ReadAsset,
  syncIndex: SyncIndex
): Promise<InstallSkillResult> {
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
      throw new Error("Provide exactly one of path or repo");
    }

    const folderName = path.basename(sourceDir);
    const name = normalizeSkillName(input.name ?? folderName);

    if (!name) {
      throw new Error("Skill name cannot be empty");
    }

    const destination = skillDir(chainHome, name);

    if ((await pathExists(skillFile(chainHome, name))) && !input.force) {
      throw new Error(`Skill already exists: skills/${name} (pass force to replace)`);
    }

    await copySkillTree(sourceDir, destination);
    await syncIndex(chainHome);

    const now = new Date().toISOString();
    const lockFile = await readSkillsLock(chainHome);
    const previous = lockFile.skills[name];
    const contentHash = await hashSkillMarkdown(skillFile(chainHome, name));
    const lockEntry: SkillLockEntry = {
      sourceType,
      source,
      subdir,
      contentHash,
      installedAt: previous?.installedAt ?? now,
      updatedAt: now
    };
    lockFile.skills[name] = lockEntry;
    await writeSkillsLock(chainHome, lockFile);

    const asset = await readAsset(chainHome, "skills", name);
    return { asset, lockEntry };
  } finally {
    if (cleanupDir) {
      await fs.rm(cleanupDir, { recursive: true, force: true });
    }
  }
}

export async function forkSkillFromHub(
  chainHome: string,
  input: ForkSkillInput,
  readAsset: ReadAsset,
  syncIndex: SyncIndex
): Promise<AssetDetail> {
  const sourceName = normalizeSkillName(input.name);
  if (!sourceName) {
    throw new Error("Skill name cannot be empty");
  }

  if (!(await pathExists(skillFile(chainHome, sourceName)))) {
    throw new Error(`Skill not found: skills/${sourceName}`);
  }

  const lockFile = await readSkillsLock(chainHome);
  const entry = lockFile.skills[sourceName] ?? null;

  if (!isUpstreamOwnedSkill(entry)) {
    throw new Error(`Skill is not upstream-owned (nothing to fork): ${sourceName}`);
  }

  const targetName = normalizeSkillName(input.as ?? `${sourceName}-local`);
  if (!targetName) {
    throw new Error("Fork name cannot be empty");
  }

  if (targetName === sourceName) {
    throw new Error("Fork name must differ from the upstream skill name");
  }

  if (await pathExists(skillFile(chainHome, targetName))) {
    throw new Error(`Skill already exists: skills/${targetName}`);
  }

  await copySkillTree(skillDir(chainHome, sourceName), skillDir(chainHome, targetName));

  if (lockFile.skills[targetName]) {
    delete lockFile.skills[targetName];
    await writeSkillsLock(chainHome, lockFile);
  }

  await syncIndex(chainHome);
  return readAsset(chainHome, "skills", targetName);
}

export async function updateSkillsFromLock(
  chainHome: string,
  input: UpdateSkillsInput,
  readAsset: ReadAsset,
  syncIndex: SyncIndex
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
      if (entry.sourceType === "path") {
        const sourceSkillMd = path.join(entry.source, "SKILL.md");
        if (!(await pathExists(sourceSkillMd))) {
          throw new Error(`Source path missing SKILL.md: ${entry.source}`);
        }

        const upstreamHash = await hashSkillMarkdown(sourceSkillMd);
        if (!input.force && entry.contentHash && entry.contentHash === upstreamHash) {
          results.push({ name, status: "skipped", lockEntry: entry });
          continue;
        }
      }

      const installed = await installSkillFromSource(
        chainHome,
        {
          path: entry.sourceType === "path" ? entry.source : undefined,
          repo: entry.sourceType === "git" ? entry.source : undefined,
          subdir: entry.subdir ?? undefined,
          name,
          force: true
        },
        readAsset,
        syncIndex
      );

      results.push({ name, status: "updated", lockEntry: installed.lockEntry });
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
  readAsset: ReadAsset,
  syncIndex: SyncIndex
): Promise<MigrateAgentsSkillsResult> {
  const lockPath = path.resolve(input.lockPath ?? path.join(os.homedir(), ".agents", ".skill-lock.json"));

  if (!(await pathExists(lockPath))) {
    throw new Error(`Agents skill lock not found: ${lockPath}`);
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
        readAsset,
        syncIndex
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
