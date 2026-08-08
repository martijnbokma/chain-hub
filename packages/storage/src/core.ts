import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { promises as fs } from "node:fs";

import {
  assetKinds,
  assertWritableAssetContent,
  ensureExplicitDescription,
  extractAssetAuthor,
  isUpstreamOwnedSkill,
  listAssetCompatIssues,
  type AssetDetail,
  type AssetKind,
  type AssetRecord,
  type CreateAssetInput,
  type ValidationResult
} from "@chain-hub/contracts";

import { readSkillsLock, removeSkillLockEntry, renameSkillLockEntry } from "./skill-install.js";
import { ensureDir, pathExists } from "./shared.js";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
type DatabaseSyncInstance = import("node:sqlite").DatabaseSync;

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

export function databaseFilePath(chainHome: string): string {
  return path.join(chainHome, "system", "chainhub.sqlite");
}

function normalizeAssetName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function assetFilePath(chainHome: string, kind: AssetKind, name: string): string {
  if (kind === "skills") {
    return path.join(chainHome, kind, name, "SKILL.md");
  }

  return path.join(chainHome, kind, `${name}.md`);
}

function toAssetId(kind: AssetKind, name: string): string {
  return `${kind}:${name}`;
}

function openDatabase(chainHome: string): DatabaseSyncInstance {
  const database = new DatabaseSync(databaseFilePath(chainHome));

  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 2000;
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      file_path TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS assets_kind_name_idx ON assets(kind, name);
  `);

  return database;
}

function mapAssetRow(row: {
  id: string;
  name: string;
  kind: AssetKind;
  relative_path: string;
  updated_at: string;
}): AssetRecord {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    relativePath: row.relative_path,
    updatedAt: row.updated_at
  };
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
  await fs.writeFile(metaFilePath(chainHome), JSON.stringify(meta, null, 2));
}

async function seedWelcomeSkill(chainHome: string): Promise<void> {
  const skillDir = path.join(chainHome, "skills", "welcome");
  const skillFile = assetFilePath(chainHome, "skills", "welcome");

  if (await pathExists(skillFile)) {
    return;
  }

  await ensureDir(skillDir);
  await fs.writeFile(
    skillFile,
    [
      "# Welcome",
      "",
      "You are inside Chain Hub.",
      "",
      "- Keep AI guidance local and portable",
      "- Prefer clear workflows over hidden magic",
      "- Validate changes before syncing into editors"
    ].join("\n")
  );
}

export async function syncAssetIndex(chainHome: string): Promise<void> {
  const discoveredAssets: AssetRecord[] = [];

  for (const currentKind of assetKinds) {
    const baseDir = path.join(chainHome, currentKind);

    if (!(await pathExists(baseDir))) {
      continue;
    }

    const entries = await fs.readdir(baseDir, { withFileTypes: true });

    for (const entry of entries) {
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
          relativePath: path.relative(chainHome, filePath),
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
          relativePath: path.relative(chainHome, filePath),
          updatedAt: stats.mtime.toISOString()
        });
      }
    }
  }

  const database = openDatabase(chainHome);

  try {
    const upsert = database.prepare(`
      INSERT INTO assets (id, name, kind, relative_path, file_path, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        kind = excluded.kind,
        relative_path = excluded.relative_path,
        file_path = excluded.file_path,
        updated_at = excluded.updated_at
    `);

    const seenIds = new Set<string>();

    for (const asset of discoveredAssets) {
      const filePath = path.join(chainHome, asset.relativePath);
      upsert.run(asset.id, asset.name, asset.kind, asset.relativePath, filePath, asset.updatedAt);
      seenIds.add(asset.id);
    }

    const rows = database.prepare("SELECT id FROM assets").all() as Array<{ id: string }>;

    for (const row of rows) {
      if (!seenIds.has(row.id)) {
        database.prepare("DELETE FROM assets WHERE id = ?").run(row.id);
      }
    }
  } finally {
    database.close();
  }
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
    await writeMeta(chainHome, { initializedAt: new Date().toISOString() });
  }

  const database = openDatabase(chainHome);
  database.close();
  await syncAssetIndex(chainHome);

  return { chainHome, isFirstRun };
}

export async function listAssets(chainHomeInput?: string, kind?: AssetKind): Promise<AssetRecord[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  await syncAssetIndex(chainHome);

  const database = openDatabase(chainHome);

  try {
    const rows = kind
      ? (database
          .prepare(
            "SELECT id, name, kind, relative_path, updated_at FROM assets WHERE kind = ? ORDER BY kind ASC, name ASC"
          )
          .all(kind) as Array<{ id: string; name: string; kind: AssetKind; relative_path: string; updated_at: string }>)
      : (database
          .prepare("SELECT id, name, kind, relative_path, updated_at FROM assets ORDER BY kind ASC, name ASC")
          .all() as Array<{ id: string; name: string; kind: AssetKind; relative_path: string; updated_at: string }>);

    const skillsLock = await readSkillsLock(chainHome);

    return await Promise.all(
      rows.map(async (row) => {
        const asset = mapAssetRow(row);
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
  } finally {
    database.close();
  }
}

export async function getAsset(chainHomeInput: string | undefined, kind: AssetKind, name: string): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  await syncAssetIndex(chainHome);

  const filePath = assetFilePath(chainHome, kind, name);
  const content = await fs.readFile(filePath, "utf8");
  const stats = await fs.stat(filePath);
  const provenance = kind === "skills" ? ((await readSkillsLock(chainHome)).skills[name] ?? null) : null;

  return {
    id: toAssetId(kind, name),
    name,
    kind,
    relativePath: path.relative(chainHome, filePath),
    updatedAt: stats.mtime.toISOString(),
    content,
    author: extractAssetAuthor(content),
    compatIssues: listAssetCompatIssues(kind, content),
    provenance
  };
}

export async function createAsset(chainHomeInput: string | undefined, input: CreateAssetInput): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const name = normalizeAssetName(input.name);

  if (!name) {
    throw new Error("Asset name cannot be empty");
  }

  const content = prepareAssetContent(input.kind, name, input.content);
  const filePath = assetFilePath(chainHome, input.kind, name);
  await ensureDir(path.dirname(filePath));

  if (await pathExists(filePath)) {
    throw new Error(`Asset already exists: ${input.kind}/${name}`);
  }

  await fs.writeFile(filePath, content, "utf8");
  await syncAssetIndex(chainHome);

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
    throw new Error(`Asset not found: ${kind}/${name}`);
  }

  if (kind === "skills") {
    const provenance = (await readSkillsLock(chainHome)).skills[name] ?? null;
    if (isUpstreamOwnedSkill(provenance)) {
      throw new Error(
        `Skill skills/${name} is upstream-owned. Fork it to customize, or edits will be lost on update.`
      );
    }
  }

  const nextContent = prepareAssetContent(kind, name, content);

  await fs.writeFile(filePath, nextContent, "utf8");
  await syncAssetIndex(chainHome);

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
  } else {
    await fs.unlink(filePath);
  }

  await syncAssetIndex(chainHome);
}

export async function renameAsset(
  chainHomeInput: string | undefined,
  kind: AssetKind,
  currentName: string,
  nextNameInput: string
): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const fromName = normalizeAssetName(currentName);
  const toName = normalizeAssetName(nextNameInput);

  if (!fromName) {
    throw new Error("Asset name cannot be empty");
  }
  if (!toName) {
    throw new Error("New asset name cannot be empty");
  }

  const fromPath = assetFilePath(chainHome, kind, fromName);
  if (!(await pathExists(fromPath))) {
    throw new Error(`Asset not found: ${kind}/${fromName}`);
  }

  if (fromName === toName) {
    return getAsset(chainHome, kind, fromName);
  }

  const toPath = assetFilePath(chainHome, kind, toName);
  if (await pathExists(toPath)) {
    throw new Error(`Asset already exists: ${kind}/${toName}`);
  }

  if (kind === "skills") {
    const provenance = (await readSkillsLock(chainHome)).skills[fromName] ?? null;
    if (isUpstreamOwnedSkill(provenance)) {
      throw new Error(
        `Skill skills/${fromName} is upstream-owned. Fork it to customize, or edits will be lost on update.`
      );
    }
    await fs.rename(path.dirname(fromPath), path.dirname(toPath));
    await renameSkillLockEntry(chainHome, fromName, toName);
  } else {
    await ensureDir(path.dirname(toPath));
    await fs.rename(fromPath, toPath);
  }

  await syncAssetIndex(chainHome);
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

  const fromName = normalizeAssetName(fromNameInput);
  const toName = normalizeAssetName(toNameInput ?? fromNameInput);

  if (!fromName) {
    throw new Error("Asset name cannot be empty");
  }
  if (!toName) {
    throw new Error("New asset name cannot be empty");
  }
  if (fromKind === toKind && fromName === toName) {
    return getAsset(chainHome, fromKind, fromName);
  }
  if (fromKind === toKind) {
    return renameAsset(chainHome, fromKind, fromName, toName);
  }

  const fromPath = assetFilePath(chainHome, fromKind, fromName);
  if (!(await pathExists(fromPath))) {
    throw new Error(`Asset not found: ${fromKind}/${fromName}`);
  }

  if (fromKind === "skills") {
    const provenance = (await readSkillsLock(chainHome)).skills[fromName] ?? null;
    if (isUpstreamOwnedSkill(provenance)) {
      throw new Error(
        `Skill skills/${fromName} is upstream-owned. Fork it to customize, then convert the fork.`
      );
    }
  }

  const toPath = assetFilePath(chainHome, toKind, toName);
  if (await pathExists(toPath)) {
    throw new Error(`Asset already exists: ${toKind}/${toName}`);
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

  await syncAssetIndex(chainHome);
  return getAsset(chainHome, toKind, toName);
}

export async function validateHub(chainHomeInput?: string): Promise<ValidationResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  await syncAssetIndex(chainHome);
  const issues: string[] = [];

  for (const dirName of CORE_DIRS) {
    if (!(await pathExists(path.join(chainHome, dirName)))) {
      issues.push(`Missing directory: ${dirName}`);
    }
  }

  const indexedAssets = await listAssets(chainHome);

  if (indexedAssets.length === 0) {
    issues.push("No assets indexed");
  }

  return {
    ok: issues.length === 0,
    issues
  };
}
