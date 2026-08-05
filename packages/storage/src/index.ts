import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { promises as fs } from "node:fs";

import {
  assetKinds,
  captureEventSchema,
  type AssetDetail,
  type AssetKind,
  type AssetRecord,
  type CaptureEvent,
  type CaptureInput,
  type CreateAssetInput,
  type CreateMemoryNoteInput,
  type DiscoveredAsset,
  type ImportAssetInput,
  type ForkSkillInput,
  type InstallSkillBundleInput,
  type InstallSkillInput,
  type InstallSkillResult,
  type MigrateAgentsSkillsInput,
  type MigrateAgentsSkillsResult,
  type Integration,
  type UpdateSkillsInput,
  type UpdateSkillsResult,
  isUpstreamOwnedSkill,
  type LearningsTimeline,
  type MemoryFile,
  type MemoryNote,
  type MemorySearchResult,
  type MemorySummary,
  type Overview,
  type ReflectionReport,
  type SetupGuide,
  type SetupStep,
  type SkillReflection,
  type ValidationResult
} from "@chain-hub/contracts";
import { EDITOR_ADAPTERS } from "./adapters/index.js";
import {
  forkSkillFromHub,
  installSkillFromBundle,
  installSkillFromSource,
  migrateAgentsSkillLock,
  readSkillsLock,
  updateSkillsFromLock
} from "./skill-install.js";

/**
 * Legacy whole-folder symlink targets. Used as a fallback for any editor id
 * that doesn't have a real EditorAdapter yet, and to clean up old symlinks
 * once an adapter takes over for that id.
 */
const LEGACY_INTEGRATION_TARGETS = [
  { id: "cursor", label: "Cursor", relativeTarget: ".cursor/chain-hub" },
  { id: "claude-code", label: "Claude Code", relativeTarget: ".claude/chain-hub" },
  { id: "windsurf", label: "Windsurf (Devin Desktop)", relativeTarget: ".codeium/windsurf/chain-hub" },
  { id: "zed", label: "Zed", relativeTarget: ".config/zed/chain-hub" }
] as const;

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
type DatabaseSyncInstance = import("node:sqlite").DatabaseSync;

const CORE_DIRS = [...assetKinds, "memory", "system", "logs"] as const;

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

/**
 * Resolves the user's home directory for editor adapter targets. Reads
 * `process.env.HOME` directly rather than `os.homedir()` — under Bun,
 * `os.homedir()` does not re-derive from a `HOME` mutated at runtime, which
 * makes it impossible to redirect in tests. Reading the env var ourselves
 * keeps `chain-hub`'s behavior identical on real machines while staying testable.
 */
function resolveHomeDir(): string {
  return process.env.HOME && process.env.HOME.trim().length > 0 ? process.env.HOME : os.homedir();
}

function metaFilePath(chainHome: string): string {
  return path.join(chainHome, "system", "meta.json");
}

function databaseFilePath(chainHome: string): string {
  return path.join(chainHome, "system", "chainhub.sqlite");
}

function normalizeAssetName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function assetFilePath(chainHome: string, kind: AssetKind, name: string): string {
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

async function readMeta(chainHome: string): Promise<AppMeta> {
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

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.lstat(target);
    return true;
  } catch {
    return false;
  }
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
      "You are inside Chain Hub v2.",
      "",
      "- Keep AI guidance local and portable",
      "- Prefer clear workflows over hidden magic",
      "- Validate changes before syncing into editors"
    ].join("\n")
  );
}

async function syncAssetIndex(chainHome: string): Promise<void> {
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

async function collectMemoryFiles(
  chainHome: string,
  currentDir: string,
  directories: Set<string>,
  files: MemoryFile[]
): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = path.relative(chainHome, absolutePath);

    if (entry.isDirectory()) {
      directories.add(relativePath);
      await collectMemoryFiles(chainHome, absolutePath, directories, files);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const stats = await fs.stat(absolutePath);
    const extension = path.extname(entry.name).replace(/^\./, "") || "none";

    files.push({
      name: entry.name,
      relativePath,
      extension,
      sizeBytes: stats.size,
      updatedAt: stats.mtime.toISOString()
    });
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

    return rows.map((row) => {
      const asset = mapAssetRow(row);
      if (asset.kind !== "skills") {
        return asset;
      }

      return {
        ...asset,
        provenance: skillsLock.skills[asset.name] ?? null
      };
    });
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

  const filePath = assetFilePath(chainHome, input.kind, name);
  await ensureDir(path.dirname(filePath));

  if (await pathExists(filePath)) {
    throw new Error(`Asset already exists: ${input.kind}/${name}`);
  }

  await fs.writeFile(filePath, input.content, "utf8");
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

  await fs.writeFile(filePath, content, "utf8");
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

export async function installSkill(
  chainHomeInput: string | undefined,
  input: InstallSkillInput
): Promise<InstallSkillResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  return installSkillFromSource(chainHome, input, async (home, kind, name) => getAsset(home, kind, name), syncAssetIndex);
}

export async function installSkillBundle(
  chainHomeInput: string | undefined,
  input: InstallSkillBundleInput
): Promise<InstallSkillResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  return installSkillFromBundle(chainHome, input, async (home, kind, name) => getAsset(home, kind, name), syncAssetIndex);
}

export async function updateSkills(
  chainHomeInput: string | undefined,
  input: UpdateSkillsInput = {}
): Promise<UpdateSkillsResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  return updateSkillsFromLock(chainHome, input, async (home, kind, name) => getAsset(home, kind, name), syncAssetIndex);
}

export async function migrateAgentsSkills(
  chainHomeInput: string | undefined,
  input: MigrateAgentsSkillsInput = {}
): Promise<MigrateAgentsSkillsResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  return migrateAgentsSkillLock(chainHome, input, async (home, kind, name) => getAsset(home, kind, name), syncAssetIndex);
}

export async function forkSkill(
  chainHomeInput: string | undefined,
  input: ForkSkillInput
): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  return forkSkillFromHub(chainHome, input, async (home, kind, name) => getAsset(home, kind, name), syncAssetIndex);
}

function findAdapter(id: string) {
  return EDITOR_ADAPTERS.find((adapter) => adapter.id === id);
}

async function legacyIntegrationStatus(
  target: (typeof LEGACY_INTEGRATION_TARGETS)[number],
  homeDir: string
): Promise<Integration> {
  const targetPath = path.join(homeDir, target.relativeTarget);
  const connected = await pathExists(targetPath);

  return {
    id: target.id,
    label: target.label,
    targetPaths: [targetPath],
    connected,
    mode: connected ? "symlink" : "missing",
    supportedKinds: [],
    unsupportedKinds: [...assetKinds]
  };
}

/** Removes a legacy whole-folder symlink for `id`, if one still exists — called once an adapter takes over. */
async function removeLegacySymlink(id: string, homeDir: string): Promise<void> {
  const target = LEGACY_INTEGRATION_TARGETS.find((entry) => entry.id === id);

  if (!target) {
    return;
  }

  const targetPath = path.join(homeDir, target.relativeTarget);

  try {
    const stats = await fs.lstat(targetPath);
    if (stats.isSymbolicLink()) {
      await fs.unlink(targetPath);
    }
  } catch {
    // nothing to clean up
  }
}

export async function getIntegrations(chainHomeInput?: string): Promise<Integration[]> {
  const homeDir = resolveHomeDir();

  return Promise.all(
    LEGACY_INTEGRATION_TARGETS.map(async (target) => {
      const adapter = findAdapter(target.id);
      return adapter ? adapter.status(homeDir) : legacyIntegrationStatus(target, homeDir);
    })
  );
}

export async function setupIntegrations(chainHomeInput?: string): Promise<Integration[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  const homeDir = resolveHomeDir();

  await initializeHub(chainHome);
  const assets = await Promise.all(
    (await listAssets(chainHome)).map((record) => getAsset(chainHome, record.kind, record.name))
  );

  await Promise.all(
    LEGACY_INTEGRATION_TARGETS.map(async (target) => {
      const adapter = findAdapter(target.id);

      if (adapter) {
        await removeLegacySymlink(target.id, homeDir);
        await adapter.resync(chainHome, homeDir, assets);
        return;
      }

      const targetPath = path.join(homeDir, target.relativeTarget);
      const targetParent = path.dirname(targetPath);

      await ensureDir(targetParent);

      if (await pathExists(targetPath)) {
        return;
      }

      await fs.symlink(chainHome, targetPath, "dir");
    })
  );

  return getIntegrations(chainHome);
}

/** Pushes a single asset change out to every editor adapter that supports its kind. Never throws — sync failures are logged, not fatal, since the source-of-truth write already succeeded. */
export async function syncAssetToEditors(
  chainHomeInput: string | undefined,
  kind: AssetKind,
  name: string,
  asset: AssetDetail | null
): Promise<void> {
  const chainHome = resolveChainHome(chainHomeInput);
  const homeDir = resolveHomeDir();

  for (const adapter of EDITOR_ADAPTERS) {
    if (!adapter.supportedKinds.includes(kind)) {
      continue;
    }

    try {
      if (adapter.mergeKinds.includes(kind)) {
        // Merge kinds rebuild a single generated file from ALL assets, not just the changed kind —
        // fetch the full list so other supported kinds aren't dropped from the rebuild.
        const assets = await Promise.all(
          (await listAssets(chainHome)).map((record) => getAsset(chainHome, record.kind, record.name))
        );
        await adapter.resync(chainHome, homeDir, assets);
        continue;
      }

      if (asset) {
        await adapter.writeAsset(chainHome, homeDir, asset);
      } else {
        await adapter.removeAsset(chainHome, homeDir, kind, name);
      }
    } catch (error) {
      console.warn(`[chain-hub] editor sync failed for ${adapter.id} (${kind}/${name}):`, error);
    }
  }
}

/** Native editor files that aren't yet Chain-Hub-managed — candidates a user can import into the hub. */
export async function discoverAssets(): Promise<DiscoveredAsset[]> {
  const homeDir = resolveHomeDir();
  const results: DiscoveredAsset[] = [];

  for (const adapter of EDITOR_ADAPTERS) {
    for (const candidate of await adapter.discover(homeDir)) {
      results.push({
        editorId: adapter.id,
        editorLabel: adapter.label,
        kind: candidate.kind,
        name: candidate.name,
        preview: makeExcerpt(candidate.content),
        sourcePath: candidate.sourcePath
      });
    }
  }

  return results;
}

/** Adopts a discovered native file into the hub as a regular managed asset. */
export async function importDiscoveredAsset(chainHomeInput: string | undefined, input: ImportAssetInput): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  const adapter = EDITOR_ADAPTERS.find((candidate) => candidate.id === input.editorId);

  if (!adapter) {
    throw new Error(`Unknown editor: ${input.editorId}`);
  }

  const candidates = await adapter.discover(resolveHomeDir());
  const match = candidates.find((candidate) => candidate.kind === input.kind && candidate.name === input.name);

  if (!match) {
    throw new Error(`No importable ${input.kind}/${input.name} found for ${input.editorId}`);
  }

  const asset = await createAsset(chainHome, { kind: match.kind, name: match.name, content: match.content });

  // Adopt the exact source file: force-write the marker into it so it stops being
  // "foreign" from the origin adapter's point of view. Without this, the regular
  // guarded sync path would (correctly, for any other file) refuse to touch it.
  const homeDir = resolveHomeDir();
  await adapter.writeAsset(chainHome, homeDir, asset, { force: true });

  return asset;
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

export async function getOverview(chainHomeInput?: string): Promise<Overview> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  await syncAssetIndex(chainHome);
  const meta = await readMeta(chainHome);
  const validation = await validateHub(chainHome);
  const assets = await listAssets(chainHome);

  const assetCounts = assetKinds.reduce<Record<AssetKind, number>>((accumulator, kind) => {
    accumulator[kind] = assets.filter((asset) => asset.kind === kind).length;
    return accumulator;
  }, {} as Record<AssetKind, number>);

  return {
    chainHome,
    initializedAt: meta.initializedAt,
    assetCounts,
    health: {
      initialized: meta.initializedAt !== null,
      issues: validation.issues
    },
    storage: {
      databasePath: databaseFilePath(chainHome),
      indexedAssets: assets.length
    }
  };
}

export async function getSetupGuide(chainHomeInput?: string): Promise<SetupGuide> {
  const chainHome = resolveChainHome(chainHomeInput);
  const overview = await getOverview(chainHome);
  const integrations = await getIntegrations(chainHome);
  const allConnected = integrations.every((integration) => integration.connected);
  const validation = await validateHub(chainHome);

  const steps: SetupStep[] = [
    {
      id: "initialize",
      label: "Initialize local hub",
      description: "Create the local folder, system paths, and SQLite metadata store.",
      complete: overview.health.initialized,
      action: "init",
      status: "pending"
    },
    {
      id: "create-first-asset",
      label: "Create first asset",
      description: "Add at least one reusable skill, rule, workflow, or agent.",
      complete: overview.storage.indexedAssets > 0,
      action: "create-asset",
      status: "pending"
    },
    {
      id: "connect-editors",
      label: "Connect editors",
      description: "Mount the hub into the supported editors on this machine.",
      complete: allConnected,
      action: "connect",
      status: "pending"
    },
    {
      id: "validate",
      label: "Validate structure",
      description: "Run a structural validation pass before daily use.",
      complete: validation.ok,
      action: "validate",
      status: "pending"
    }
  ];

  let currentAssigned = false;

  for (const step of steps) {
    if (step.complete) {
      step.status = "done";
      continue;
    }

    if (!currentAssigned) {
      step.status = "current";
      currentAssigned = true;
      continue;
    }

    step.status = "pending";
  }

  return {
    chainHome,
    steps,
    nextAction: currentAssigned ? steps.find((step) => step.status === "current")!.action : "done"
  };
}

export async function getMemorySummary(chainHomeInput?: string): Promise<MemorySummary> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const memoryPath = path.join(chainHome, "memory");
  const directories = new Set<string>(["memory"]);
  const files: MemoryFile[] = [];

  if (await pathExists(memoryPath)) {
    await collectMemoryFiles(chainHome, memoryPath, directories, files);
  }

  const sortedFiles = [...files].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  const extensionMap = files.reduce<Map<string, number>>((accumulator, file) => {
    accumulator.set(file.extension, (accumulator.get(file.extension) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());

  return {
    chainHome,
    memoryPath,
    totalFiles: files.length,
    totalBytes,
    directories: [...directories].sort((left, right) => left.localeCompare(right)),
    extensions: [...extensionMap.entries()]
      .map(([extension, count]) => ({ extension, count }))
      .sort((left, right) => right.count - left.count || left.extension.localeCompare(right.extension)),
    recentFiles: sortedFiles.slice(0, 8),
    status: files.length === 0 ? "empty" : "active"
  };
}

function noteNameToFilename(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractTitle(content: string, fallbackName: string): string {
  const firstLine = content.split("\n").find((line) => line.trim().length > 0) ?? "";
  const headingMatch = /^#{1,6}\s+(.+)$/.exec(firstLine.trim());

  return headingMatch ? headingMatch[1].trim() : fallbackName;
}

function makeExcerpt(content: string, maxLength = 120): string {
  const stripped = content.replace(/^#{1,6}\s+.+$/m, "").replace(/\n+/g, " ").trim();
  return stripped.length > maxLength ? `${stripped.slice(0, maxLength)}…` : stripped;
}

async function collectAllMemoryNotes(chainHome: string): Promise<MemoryNote[]> {
  const memoryPath = path.join(chainHome, "memory");
  const directories = new Set<string>();
  const files: MemoryFile[] = [];

  if (!(await pathExists(memoryPath))) {
    return [];
  }

  await collectMemoryFiles(chainHome, memoryPath, directories, files);

  const mdFiles = files.filter((file) => file.extension === "md");
  const notes: MemoryNote[] = [];

  for (const file of mdFiles) {
    const absolutePath = path.join(chainHome, file.relativePath);
    const content = await fs.readFile(absolutePath, "utf8").catch(() => "");
    notes.push({
      relativePath: file.relativePath,
      name: file.name.replace(/\.md$/, ""),
      title: extractTitle(content, file.name.replace(/\.md$/, "")),
      content,
      sizeBytes: file.sizeBytes,
      updatedAt: file.updatedAt
    });
  }

  return notes.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listMemoryNotes(chainHomeInput?: string): Promise<MemoryNote[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  return collectAllMemoryNotes(chainHome);
}

export async function getMemoryNote(chainHomeInput: string | undefined, relativePath: string): Promise<MemoryNote> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const absolutePath = path.join(chainHome, relativePath);

  if (!(await pathExists(absolutePath))) {
    throw new Error(`Memory note not found: ${relativePath}`);
  }

  const content = await fs.readFile(absolutePath, "utf8");
  const stats = await fs.stat(absolutePath);
  const name = path.basename(relativePath, ".md");

  return {
    relativePath,
    name,
    title: extractTitle(content, name),
    content,
    sizeBytes: stats.size,
    updatedAt: stats.mtime.toISOString()
  };
}

export async function createMemoryNote(
  chainHomeInput: string | undefined,
  input: CreateMemoryNoteInput
): Promise<MemoryNote> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const safeName = noteNameToFilename(input.name);

  if (!safeName) {
    throw new Error("Note name cannot be empty");
  }

  const dir = input.subdirectory
    ? path.join(chainHome, "memory", noteNameToFilename(input.subdirectory))
    : path.join(chainHome, "memory");

  await ensureDir(dir);

  const filePath = path.join(dir, `${safeName}.md`);

  if (await pathExists(filePath)) {
    throw new Error(`Memory note already exists: ${path.relative(chainHome, filePath)}`);
  }

  const content = input.content || `# ${input.name}\n\n`;
  await fs.writeFile(filePath, content, "utf8");

  return getMemoryNote(chainHome, path.relative(chainHome, filePath));
}

export async function updateMemoryNote(
  chainHomeInput: string | undefined,
  relativePath: string,
  content: string
): Promise<MemoryNote> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const absolutePath = path.join(chainHome, relativePath);

  if (!(await pathExists(absolutePath))) {
    throw new Error(`Memory note not found: ${relativePath}`);
  }

  await fs.writeFile(absolutePath, content, "utf8");

  return getMemoryNote(chainHome, relativePath);
}

export async function deleteMemoryNote(chainHomeInput: string | undefined, relativePath: string): Promise<void> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const absolutePath = path.join(chainHome, relativePath);

  if (!(await pathExists(absolutePath))) {
    return;
  }

  await fs.unlink(absolutePath);
}

function learningsLogPath(chainHome: string): string {
  return path.join(chainHome, "memory", "learnings", "events.jsonl");
}

export async function captureEvent(chainHomeInput: string | undefined, input: CaptureInput): Promise<CaptureEvent> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const logPath = learningsLogPath(chainHome);
  await ensureDir(path.dirname(logPath));

  const event: CaptureEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    skill: input.skill,
    summary: input.summary,
    capturedAt: new Date().toISOString()
  };

  await fs.appendFile(logPath, JSON.stringify(event) + "\n", "utf8");

  return event;
}

export async function getLearningsTimeline(
  chainHomeInput: string | undefined,
  limit = 100,
  offset = 0
): Promise<LearningsTimeline> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const logPath = learningsLogPath(chainHome);

  if (!(await pathExists(logPath))) {
    return { totalEvents: 0, returnedEvents: 0, offset, skippedLines: 0, logPath, events: [], status: "empty" };
  }

  const raw = await fs.readFile(logPath, "utf8");
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const events: CaptureEvent[] = [];
  let skippedLines = 0;

  for (const line of lines) {
    try {
      const parsed = captureEventSchema.parse(JSON.parse(line));
      events.push(parsed);
    } catch {
      skippedLines++;
    }
  }

  const sorted = [...events].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  const page = sorted.slice(offset, offset + limit);

  return {
    totalEvents: events.length,
    returnedEvents: page.length,
    offset,
    skippedLines,
    logPath,
    events: page,
    status: events.length === 0 ? "empty" : "active"
  };
}

export async function buildReflectionReport(chainHomeInput: string | undefined): Promise<ReflectionReport> {
  const chainHome = resolveChainHome(chainHomeInput);
  const timeline = await getLearningsTimeline(chainHome);

  const bySkill = new Map<string, CaptureEvent[]>();

  for (const event of timeline.events) {
    const list = bySkill.get(event.skill) ?? [];
    list.push(event);
    bySkill.set(event.skill, list);
  }

  const skills: SkillReflection[] = [];

  for (const [skill, events] of bySkill) {
    const sorted = [...events].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    const successCount = events.filter((e) => e.type === "success").length;
    const failureCount = events.filter((e) => e.type === "failure").length;
    const correctionCount = events.filter((e) => e.type === "correction").length;
    const noteCount = events.filter((e) => e.type === "note").length;

    let trend: SkillReflection["trend"];
    if (events.length === 1) {
      trend = "new";
    } else if (successCount > failureCount + correctionCount) {
      trend = "improving";
    } else if (failureCount + correctionCount > successCount) {
      trend = "struggling";
    } else {
      trend = "stable";
    }

    const recentEvents = [...events]
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .slice(0, 3);

    skills.push({
      skill,
      totalEvents: events.length,
      successCount,
      failureCount,
      correctionCount,
      noteCount,
      firstSeen: sorted[0].capturedAt,
      lastSeen: sorted[sorted.length - 1].capturedAt,
      trend,
      recentEvents
    });
  }

  skills.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

  return {
    generatedAt: new Date().toISOString(),
    totalEvents: timeline.totalEvents,
    totalSkills: skills.length,
    skills,
    logPath: timeline.logPath
  };
}

export async function writeReflectionMarkdown(chainHomeInput: string | undefined): Promise<{ filePath: string; content: string }> {
  const chainHome = resolveChainHome(chainHomeInput);
  const report = await buildReflectionReport(chainHome);

  const dateSlug = new Date().toISOString().slice(0, 10);
  const reflectionsDir = path.join(chainHome, "memory", "reflections");
  await ensureDir(reflectionsDir);
  const filePath = path.join(reflectionsDir, `${dateSlug}.md`);

  const trendIcon: Record<string, string> = { improving: "↑", struggling: "↓", stable: "→", new: "★" };

  const lines: string[] = [
    `# Reflection — ${dateSlug}`,
    ``,
    `> Generated ${new Date(report.generatedAt).toLocaleString()} · ${report.totalEvents} events · ${report.totalSkills} skills`,
    ``
  ];

  if (report.skills.length === 0) {
    lines.push("No events captured yet.");
  } else {
    for (const skill of report.skills) {
      const icon = trendIcon[skill.trend] ?? "?";
      lines.push(`## ${icon} ${skill.skill} \`[${skill.trend}]\``);
      lines.push(``);
      lines.push(`**${skill.totalEvents} events** · ${skill.successCount} success / ${skill.failureCount} failure / ${skill.correctionCount} correction / ${skill.noteCount} note`);
      lines.push(``);
      if (skill.recentEvents.length > 0) {
        lines.push(`### Recent events`);
        lines.push(``);
        for (const e of skill.recentEvents) {
          const ts = new Date(e.capturedAt).toLocaleDateString();
          lines.push(`- \`[${e.type}]\` ${e.summary} *(${ts})*`);
        }
        lines.push(``);
      }
    }
  }

  const content = lines.join("\n");
  await fs.writeFile(filePath, content, "utf8");

  return { filePath, content };
}

export async function searchMemoryNotes(chainHomeInput: string | undefined, query: string): Promise<MemorySearchResult[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  if (!query.trim()) {
    const notes = await collectAllMemoryNotes(chainHome);
    return notes.map((note) => ({
      relativePath: note.relativePath,
      name: note.name,
      title: note.title,
      excerpt: makeExcerpt(note.content),
      updatedAt: note.updatedAt
    }));
  }

  const lower = query.toLowerCase();
  const notes = await collectAllMemoryNotes(chainHome);

  return notes
    .filter((note) => note.name.toLowerCase().includes(lower) || note.title.toLowerCase().includes(lower) || note.content.toLowerCase().includes(lower))
    .map((note) => {
      const contentLower = note.content.toLowerCase();
      const idx = contentLower.indexOf(lower);
      let excerpt: string;

      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(note.content.length, idx + lower.length + 80);
        const raw = note.content.slice(start, end).replace(/\n+/g, " ").trim();
        excerpt = (start > 0 ? "…" : "") + raw + (end < note.content.length ? "…" : "");
      } else {
        excerpt = makeExcerpt(note.content);
      }

      return {
        relativePath: note.relativePath,
        name: note.name,
        title: note.title,
        excerpt,
        updatedAt: note.updatedAt
      };
    });
}
