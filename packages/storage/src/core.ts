import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

import {
  assertWritableAssetContent,
  type AssetDetail,
  type AssetKind,
  assetKinds,
  type AssetRecord,
  ConflictError,
  type CreateAssetInput,
  ensureExplicitDescription,
  extractAssetAuthor,
  InvalidInputError,
  isUpstreamOwnedSkill,
  listAssetCompatIssues,
  NotFoundError,
  type ValidationResult
} from "@chain-hub/contracts";

import { seedLearningsRule, seedWelcomeSkill } from "./seed.js";
import { CORRUPT_LOCK_PREFIX, readSkillsLock, removeSkillLockEntry, renameSkillLockEntry } from "./skill-install.js";
import { ensureDir, pathExists, writeFileAtomic } from "./shared.js";

function prepareAssetContent(kind: AssetKind, name: string, content: string): string {
  const prepared = kind === "skills" ? ensureExplicitDescription(content, name) : content;
  assertWritableAssetContent(kind, prepared);
  return prepared;
}

export const CORE_DIRS = [...assetKinds, "memory", "system", "logs"] as const;

type AppMeta = {
  initializedAt: string | null;
};

export const DEFAULT_CHAIN_HOME = path.join(os.homedir(), ".chain-hub");

export function resolveChainHome(input?: string): string {
  if (input && input.trim().length > 0) {
    return path.resolve(input);
  }

  return process.env.CHAIN_HOME ? path.resolve(process.env.CHAIN_HOME) : DEFAULT_CHAIN_HOME;
}

export function metaFilePath(chainHome: string): string {
  return path.join(chainHome, "system", "meta.json");
}

/** Index files written by versions that kept a SQLite copy of the asset list. */
const LEGACY_INDEX_FILES = ["chainhub.sqlite", "chainhub.sqlite-wal", "chainhub.sqlite-shm"];

function normalizeAssetName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function assertSafeAssetName(name: string): string {
  if (!name || typeof name !== "string") {
    throw new InvalidInputError("Asset name cannot be empty");
  }
  const trimmed = name.trim();
  if (
    trimmed.length === 0 ||
    trimmed.includes("..") ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes("\0")
  ) {
    throw new InvalidInputError(`Invalid asset name: "${name}". Path traversal characters are not allowed.`);
  }
  return trimmed;
}

export function assertSafeAssetKind(kind: string): AssetKind {
  // Route params and CLI flags arrive as plain strings; an unknown kind like ".." would escape the hub.
  if (!(assetKinds as readonly string[]).includes(kind)) {
    throw new InvalidInputError(`Invalid asset kind: "${kind}". Expected one of: ${assetKinds.join(", ")}.`);
  }
  return kind as AssetKind;
}

export function assetFilePath(chainHome: string, kind: AssetKind, name: string): string {
  assertSafeAssetKind(kind);
  const safeName = assertSafeAssetName(name);
  const resolvedKindDir = path.resolve(chainHome, kind);
  const target =
    kind === "skills"
      ? path.resolve(resolvedKindDir, safeName, "SKILL.md")
      : path.resolve(resolvedKindDir, `${safeName}.md`);

  if (!target.startsWith(resolvedKindDir + path.sep)) {
    throw new InvalidInputError(`Unsafe asset path for ${kind}/${name}`);
  }

  return target;
}

/** API paths use forward slashes on every OS (Windows `path.relative` returns backslashes). */
function toPosixRelative(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join("/");
}

function toAssetId(kind: AssetKind, name: string): string {
  return `${kind}:${name}`;
}

export async function readMeta(chainHome: string): Promise<AppMeta> {
  try {
    const contents = await fs.readFile(metaFilePath(chainHome), "utf8");
    return JSON.parse(contents) as AppMeta;
  } catch {
    return { initializedAt: null };
  }
}

async function writeMeta(chainHome: string, meta: AppMeta): Promise<void> {
  await fs.mkdir(path.dirname(metaFilePath(chainHome)), { recursive: true });
  await writeFileAtomic(metaFilePath(chainHome), JSON.stringify(meta, null, 2));
}

/**
 * The hub folder is the source of truth: list assets straight from disk, sorted by kind then name.
 * One pass over at most a few hundred directory entries — cheaper than keeping an index in sync.
 */
export async function scanAssets(chainHome: string): Promise<AssetRecord[]> {
  const discoveredAssets: AssetRecord[] = [];

  for (const currentKind of assetKinds) {
    const baseDir = path.join(chainHome, currentKind);

    if (!(await pathExists(baseDir))) {
      continue;
    }

    const entries = await fs.readdir(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      // Hidden entries and in-flight install staging folders are not assets.
      if (entry.name.startsWith(".") || entry.name.includes(".staging-") || entry.name.includes("..")) {
        continue;
      }

      if (currentKind === "skills" && entry.isDirectory()) {
        const filePath = assetFilePath(chainHome, currentKind, entry.name);

        if (!(await pathExists(filePath))) {
          continue;
        }

        const stats = await fs.stat(filePath);
        discoveredAssets.push({
          id: toAssetId(currentKind, entry.name),
          name: entry.name,
          kind: currentKind,
          relativePath: toPosixRelative(chainHome, filePath),
          updatedAt: stats.mtime.toISOString()
        });

        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".md")) {
        const name = entry.name.replace(/\.md$/, "");
        const filePath = assetFilePath(chainHome, currentKind, name);
        const stats = await fs.stat(filePath);

        discoveredAssets.push({
          id: toAssetId(currentKind, name),
          name,
          kind: currentKind,
          relativePath: toPosixRelative(chainHome, filePath),
          updatedAt: stats.mtime.toISOString()
        });
      }
    }
  }

  return discoveredAssets.sort((a, b) =>
    a.kind === b.kind ? (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) : a.kind < b.kind ? -1 : 1
  );
}

export async function initializeHub(chainHomeInput?: string): Promise<{ chainHome: string; isFirstRun: boolean }> {
  const chainHome = resolveChainHome(chainHomeInput);

  await ensureDir(chainHome);

  for (const dirName of CORE_DIRS) {
    await ensureDir(path.join(chainHome, dirName));
  }

  const meta = await readMeta(chainHome);
  const isFirstRun = !meta.initializedAt;

  // Seed only on first init — otherwise deleting welcome is undone by every listAssets call.
  if (isFirstRun) {
    await seedWelcomeSkill(chainHome);
    await seedLearningsRule(chainHome);
    await writeMeta(chainHome, { initializedAt: new Date().toISOString() });
  }

  for (const fileName of LEGACY_INDEX_FILES) {
    await fs.rm(path.join(chainHome, "system", fileName), { force: true });
  }

  return { chainHome, isFirstRun };
}

export async function listAssets(chainHomeInput?: string, kind?: AssetKind): Promise<AssetRecord[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const records = (await scanAssets(chainHome)).filter((record) => !kind || record.kind === kind);
  const skillsLock = await readSkillsLock(chainHome);

  return await Promise.all(
    records.map(async (asset) => {
      const filePath = path.join(chainHome, asset.relativePath);
      let author: string | null = null;
      let compatIssues: ReturnType<typeof listAssetCompatIssues> = [];

      try {
        const content = await fs.readFile(filePath, "utf8");
        author = extractAssetAuthor(content);
        compatIssues = listAssetCompatIssues(asset.kind, content);
      } catch {
        author = null;
      }

      if (asset.kind !== "skills") {
        return { ...asset, author, compatIssues };
      }

      return {
        ...asset,
        author,
        compatIssues,
        provenance: skillsLock.skills[asset.name] ?? null
      };
    })
  );
}

/** Every asset with its content, read in one pass — for editor resyncs that need the full set. */
export async function loadAllAssetDetails(chainHomeInput?: string): Promise<AssetDetail[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const skillsLock = await readSkillsLock(chainHome);

  return Promise.all(
    (await scanAssets(chainHome)).map(async (record) => {
      const content = await fs.readFile(path.join(chainHome, record.relativePath), "utf8");
      return {
        ...record,
        content,
        author: extractAssetAuthor(content),
        compatIssues: listAssetCompatIssues(record.kind, content),
        provenance: record.kind === "skills" ? (skillsLock.skills[record.name] ?? null) : null
      };
    })
  );
}

export async function getAsset(chainHomeInput: string | undefined, kind: AssetKind, name: string): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const filePath = assetFilePath(chainHome, kind, name);
  if (!(await pathExists(filePath))) {
    throw new NotFoundError(`Asset not found: ${kind}/${name}`);
  }
  const content = await fs.readFile(filePath, "utf8");
  const stats = await fs.stat(filePath);
  const provenance = kind === "skills" ? ((await readSkillsLock(chainHome)).skills[name] ?? null) : null;

  return {
    id: toAssetId(kind, name),
    name,
    kind,
    relativePath: toPosixRelative(chainHome, filePath),
    updatedAt: stats.mtime.toISOString(),
    content,
    author: extractAssetAuthor(content),
    compatIssues: listAssetCompatIssues(kind, content),
    provenance
  };
}

/** Upstream-locked skills are replaced on `skill update`, so hub edits to them would be lost. */
async function assertEditableSkill(chainHome: string, name: string, advice: string): Promise<void> {
  const provenance = (await readSkillsLock(chainHome)).skills[name] ?? null;
  if (isUpstreamOwnedSkill(provenance)) {
    throw new ConflictError(`Skill skills/${name} is upstream-owned. ${advice}`);
  }
}

/**
 * Validates the names for a rename or kind change. The current name is the existing folder or
 * file name as-is (imports can keep any case); only the new name is normalized.
 */
function resolveMoveNames(currentName: string, nextName: string): { fromName: string; toName: string } {
  const fromName = assertSafeAssetName(currentName);
  const toName = normalizeAssetName(nextName);

  if (!fromName) {
    throw new InvalidInputError("Asset name cannot be empty");
  }
  if (!toName) {
    throw new InvalidInputError("New asset name cannot be empty");
  }
  return { fromName, toName };
}

const EDIT_UPSTREAM_ADVICE = "Fork it to customize, or edits will be lost on update.";

export async function createAsset(chainHomeInput: string | undefined, input: CreateAssetInput): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const name = normalizeAssetName(input.name);

  if (!name) {
    throw new InvalidInputError("Asset name cannot be empty");
  }

  const content = prepareAssetContent(input.kind, name, input.content);
  const filePath = assetFilePath(chainHome, input.kind, name);
  await ensureDir(path.dirname(filePath));

  if (await pathExists(filePath)) {
    throw new ConflictError(`Asset already exists: ${input.kind}/${name}`);
  }

  await fs.writeFile(filePath, content, "utf8");

  return getAsset(chainHome, input.kind, name);
}

export async function updateAsset(
  chainHomeInput: string | undefined,
  kind: AssetKind,
  name: string,
  content: string
): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const filePath = assetFilePath(chainHome, kind, name);

  if (!(await pathExists(filePath))) {
    throw new NotFoundError(`Asset not found: ${kind}/${name}`);
  }

  if (kind === "skills") {
    await assertEditableSkill(chainHome, name, EDIT_UPSTREAM_ADVICE);
  }

  const nextContent = prepareAssetContent(kind, name, content);

  await fs.writeFile(filePath, nextContent, "utf8");

  return getAsset(chainHome, kind, name);
}

export async function deleteAsset(chainHomeInput: string | undefined, kind: AssetKind, name: string): Promise<void> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const filePath = assetFilePath(chainHome, kind, name);

  if (!(await pathExists(filePath))) {
    return;
  }

  if (kind === "skills") {
    await fs.rm(path.dirname(filePath), { recursive: true, force: true });
    // A leftover lock entry would make `skill update` reinstall the skill and mark a
    // future skill with the same name as upstream-owned.
    await removeSkillLockEntry(chainHome, name);
  } else {
    await fs.unlink(filePath);
  }

}

export async function renameAsset(
  chainHomeInput: string | undefined,
  kind: AssetKind,
  currentName: string,
  nextNameInput: string
): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const { fromName, toName } = resolveMoveNames(currentName, nextNameInput);

  const fromPath = assetFilePath(chainHome, kind, fromName);
  if (!(await pathExists(fromPath))) {
    throw new NotFoundError(`Asset not found: ${kind}/${fromName}`);
  }

  if (fromName === toName) {
    return getAsset(chainHome, kind, fromName);
  }

  const toPath = assetFilePath(chainHome, kind, toName);
  if (await pathExists(toPath)) {
    throw new ConflictError(`Asset already exists: ${kind}/${toName}`);
  }

  if (kind === "skills") {
    await assertEditableSkill(chainHome, fromName, EDIT_UPSTREAM_ADVICE);
    await fs.rename(path.dirname(fromPath), path.dirname(toPath));
    await renameSkillLockEntry(chainHome, fromName, toName);
  } else {
    await ensureDir(path.dirname(toPath));
    await fs.rename(fromPath, toPath);
  }

  return getAsset(chainHome, kind, toName);
}

/**
 * Move an asset to a different Library kind, keeping content (and optionally renaming).
 * Upstream-locked skills cannot be converted — fork first.
 */
export async function convertAssetKind(
  chainHomeInput: string | undefined,
  fromKind: AssetKind,
  fromNameInput: string,
  toKind: AssetKind,
  toNameInput?: string
): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const { fromName, toName } = resolveMoveNames(fromNameInput, toNameInput ?? fromNameInput);
  if (fromKind === toKind && fromName === toName) {
    return getAsset(chainHome, fromKind, fromName);
  }
  if (fromKind === toKind) {
    return renameAsset(chainHome, fromKind, fromName, toName);
  }

  const fromPath = assetFilePath(chainHome, fromKind, fromName);
  if (!(await pathExists(fromPath))) {
    throw new NotFoundError(`Asset not found: ${fromKind}/${fromName}`);
  }

  if (fromKind === "skills") {
    await assertEditableSkill(chainHome, fromName, "Fork it to customize, then convert the fork.");
  }

  const toPath = assetFilePath(chainHome, toKind, toName);
  if (await pathExists(toPath)) {
    throw new ConflictError(`Asset already exists: ${toKind}/${toName}`);
  }

  const content = await fs.readFile(fromPath, "utf8");
  const nextContent = prepareAssetContent(toKind, toName, content);
  await ensureDir(path.dirname(toPath));
  await fs.writeFile(toPath, nextContent, "utf8");

  if (fromKind === "skills") {
    await fs.rm(path.dirname(fromPath), { recursive: true, force: true });
    await removeSkillLockEntry(chainHome, fromName);
  } else {
    await fs.unlink(fromPath);
  }

  return getAsset(chainHome, toKind, toName);
}

export async function validateHub(chainHomeInput?: string): Promise<ValidationResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  const issues: string[] = [];
  const checks: ValidationResult["checks"] = [];

  for (const dirName of CORE_DIRS) {
    const dirPath = path.join(chainHome, dirName);
    const exists = await pathExists(dirPath);
    if (exists) {
      checks.push({
        id: `dir:${dirName}`,
        label: `Directory exists: ${dirName}`,
        status: "pass",
        detail: dirPath
      });
    } else {
      const detail = `Missing directory: ${dirName}`;
      issues.push(detail);
      checks.push({
        id: `dir:${dirName}`,
        label: `Directory exists: ${dirName}`,
        status: "fail",
        detail
      });
    }
  }

  const corruptLocks = (await fs.readdir(path.join(chainHome, "system")).catch(() => [] as string[])).filter((name) =>
    name.startsWith(CORRUPT_LOCK_PREFIX)
  );
  if (corruptLocks.length > 0) {
    const detail = `system/skills-lock.json could not be read and was moved to system/${corruptLocks.sort().at(-1)}; installed skills now show as local. Restore or delete that file.`;
    issues.push(detail);
    checks.push({ id: "skills-lock", label: "Skills lock is readable", status: "fail", detail });
  }

  const indexedAssets = await listAssets(chainHome);

  if (indexedAssets.length === 0) {
    const detail = "No assets indexed";
    issues.push(detail);
    checks.push({ id: "assets-indexed", label: "At least one asset indexed", status: "fail", detail });
  } else {
    checks.push({
      id: "assets-indexed",
      label: "At least one asset indexed",
      status: "pass",
      detail: `${indexedAssets.length} asset${indexedAssets.length === 1 ? "" : "s"} indexed`
    });
  }

  return {
    ok: issues.length === 0,
    issues,
    checks
  };
}
