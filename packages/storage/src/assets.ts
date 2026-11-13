import path from "node:path";
import { promises as fs } from "node:fs";

import {
  type AssetDetail,
  type AssetKind,
  assetKinds,
  type AssetRecord,
  ConflictError,
  type CreateAssetInput,
  extractAssetAuthor,
  InvalidInputError,
  isUpstreamOwnedSkill,
  listAssetCompatIssues,
  NotFoundError
} from "@chain-hub/contracts";

import {
  assetFilePath,
  assertSafeAssetName,
  normalizeAssetName,
  prepareAssetContent,
  resolveChainHome,
  toAssetId,
  toPosixRelative
} from "./asset-paths.js";
import { initializeHub } from "./hub-init.js";
import { installLockKey, readInstallLock, removeInstallLockEntry } from "./install-lock.js";
import { runSecurityGate, type SkillInstallSecurity } from "./security-gate.js";
import {
  copySecurityScan,
  getSecurityScan,
  readSecurityScans,
  removeSecurityScan,
  renameSecurityScan
} from "./security-store.js";
import { removeSkillLockEntry, renameSkillLockEntry } from "./skills-lock.js";
import { ensureDir, pathExists } from "./shared.js";

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

export async function listAssets(chainHomeInput?: string, kind?: AssetKind): Promise<AssetRecord[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const records = (await scanAssets(chainHome)).filter((record) => !kind || record.kind === kind);
  const installLock = await readInstallLock(chainHome);
  const securityScans = (await readSecurityScans(chainHome)).scans;

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

      return {
        ...asset,
        author,
        compatIssues,
        provenance: installLock.entries[installLockKey(asset.kind, asset.name)] ?? null,
        securityScan: securityScans[installLockKey(asset.kind, asset.name)] ?? null
      };
    })
  );
}

/** Every asset with its content, read in one pass — for editor resyncs that need the full set. */
export async function loadAllAssetDetails(chainHomeInput?: string): Promise<AssetDetail[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const installLock = await readInstallLock(chainHome);
  const securityScans = (await readSecurityScans(chainHome)).scans;

  return Promise.all(
    (await scanAssets(chainHome)).map(async (record) => {
      const content = await fs.readFile(path.join(chainHome, record.relativePath), "utf8");
      return {
        ...record,
        content,
        author: extractAssetAuthor(content),
        compatIssues: listAssetCompatIssues(record.kind, content),
        provenance: installLock.entries[installLockKey(record.kind, record.name)] ?? null,
        securityScan: securityScans[installLockKey(record.kind, record.name)] ?? null
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
  const provenance = await readAssetProvenance(chainHome, kind, name);
  const securityScan = await getSecurityScan(chainHome, kind, name);

  return {
    id: toAssetId(kind, name),
    name,
    kind,
    relativePath: toPosixRelative(chainHome, filePath),
    updatedAt: stats.mtime.toISOString(),
    content,
    author: extractAssetAuthor(content),
    compatIssues: listAssetCompatIssues(kind, content),
    provenance,
    securityScan
  };
}

async function readAssetProvenance(chainHome: string, kind: AssetKind, name: string) {
  return (await readInstallLock(chainHome)).entries[installLockKey(kind, name)] ?? null;
}

/** Upstream-locked assets (any kind) are replaced on update, so hub edits to them would be lost. */
async function assertEditableAsset(chainHome: string, kind: AssetKind, name: string, advice: string): Promise<void> {
  if (isUpstreamOwnedSkill(await readAssetProvenance(chainHome, kind, name))) {
    const label = kind === "skills" ? "Skill" : "Asset";
    throw new ConflictError(`${label} ${kind}/${name} is upstream-owned. ${advice}`);
  }
}

/**
 * Copy an upstream-owned single-file asset (agents, workflows, …) to an editable local
 * asset without a lock entry. Skills use `forkSkillFromHub` (directory trees).
 */
export async function forkHubAsset(
  chainHomeInput: string | undefined,
  kind: AssetKind,
  nameInput: string,
  asInput?: string
): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const name = assertSafeAssetName(nameInput);
  const fromPath = assetFilePath(chainHome, kind, name);
  if (!(await pathExists(fromPath))) {
    throw new NotFoundError(`Asset not found: ${kind}/${name}`);
  }
  if (!isUpstreamOwnedSkill(await readAssetProvenance(chainHome, kind, name))) {
    throw new ConflictError(`Asset is not upstream-owned (nothing to fork): ${kind}/${name}`);
  }

  const targetName = normalizeAssetName(asInput ?? `${name}-local`);
  if (!targetName) {
    throw new InvalidInputError("Fork name cannot be empty");
  }
  if (targetName === name) {
    throw new ConflictError(`Fork name must differ from the upstream ${kind} name`);
  }
  const toPath = assetFilePath(chainHome, kind, targetName);
  if (await pathExists(toPath)) {
    throw new ConflictError(`Asset already exists: ${kind}/${targetName}`);
  }

  const content = await fs.readFile(fromPath, "utf8");
  await ensureDir(path.dirname(toPath));
  await fs.writeFile(toPath, prepareAssetContent(kind, targetName, content), "utf8");
  await removeInstallLockEntry(chainHome, kind, targetName);
  await copySecurityScan(chainHome, kind, name, kind, targetName);

  return getAsset(chainHome, kind, targetName);
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

export async function createAsset(
  chainHomeInput: string | undefined,
  input: CreateAssetInput,
  security?: SkillInstallSecurity & { allowUnsafe?: boolean }
): Promise<AssetDetail> {
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

  await runSecurityGate(chainHome, {
    kind: input.kind,
    name,
    context: security?.context ?? "edit",
    files: [{ path: input.kind === "skills" ? "SKILL.md" : `${name}.md`, content }],
    allowUnsafe: security?.allowUnsafe,
    extraScanner: security?.extraScanner
  });

  await fs.writeFile(filePath, content, "utf8");

  return getAsset(chainHome, input.kind, name);
}

export async function updateAsset(
  chainHomeInput: string | undefined,
  kind: AssetKind,
  name: string,
  content: string,
  security?: SkillInstallSecurity & { allowUnsafe?: boolean }
): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);

  const filePath = assetFilePath(chainHome, kind, name);

  if (!(await pathExists(filePath))) {
    throw new NotFoundError(`Asset not found: ${kind}/${name}`);
  }

  await assertEditableAsset(chainHome, kind, name, EDIT_UPSTREAM_ADVICE);

  const nextContent = prepareAssetContent(kind, name, content);

  await runSecurityGate(chainHome, {
    kind,
    name,
    context: security?.context ?? "edit",
    files: [{ path: kind === "skills" ? "SKILL.md" : `${name}.md`, content: nextContent }],
    allowUnsafe: security?.allowUnsafe,
    extraScanner: security?.extraScanner
  });

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
    await removeInstallLockEntry(chainHome, kind, name);
  }
  await removeSecurityScan(chainHome, kind, name);
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

  await assertEditableAsset(chainHome, kind, fromName, EDIT_UPSTREAM_ADVICE);

  if (kind === "skills") {
    await fs.rename(path.dirname(fromPath), path.dirname(toPath));
    await renameSkillLockEntry(chainHome, fromName, toName);
  } else {
    await ensureDir(path.dirname(toPath));
    await fs.rename(fromPath, toPath);
  }
  await renameSecurityScan(chainHome, kind, fromName, kind, toName);

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

  await assertEditableAsset(chainHome, fromKind, fromName, "Fork it to customize, then convert the fork.");

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
  await renameSecurityScan(chainHome, fromKind, fromName, toKind, toName);

  return getAsset(chainHome, toKind, toName);
}
