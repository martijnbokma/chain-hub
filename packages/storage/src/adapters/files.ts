import path from "node:path";
import { promises as fs } from "node:fs";

import { assetKinds, type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { pathExists } from "../shared.js";
import { parseFrontmatter } from "./frontmatter.js";
import { hasFrontmatterMarker, hasHeaderMarker } from "./marker.js";
import { removeEditorSkillDirectory } from "./skill-sidecars.js";

export { pathExists };

export { listFlatCandidates, listSkillCandidates, readUnmanagedCandidates, type CandidateFile } from "./candidates.js";

export type MarkerCheck = "frontmatter" | "header";

async function isManaged(content: string, markerCheck: MarkerCheck): Promise<boolean> {
  return markerCheck === "frontmatter" ? hasFrontmatterMarker(parseFrontmatter(content).data) : hasHeaderMarker(content);
}

export interface BackupTarget {
  chainHome: string;
  homeDir: string;
}

export interface WriteManagedOptions {
  force?: boolean;
  /** Where to keep a copy of a hand-written file before `force` overwrites it. */
  backup?: BackupTarget;
}

/**
 * Copies a file that is about to be overwritten into
 * `<chainHome>/backups/<YYYY-MM-DD>/<path relative to home>` and returns the backup path.
 */
export async function backupForeignFile(filePath: string, target: BackupTarget): Promise<string> {
  const relative = path.relative(target.homeDir, filePath);
  const safeRelative =
    relative.startsWith("..") || path.isAbsolute(relative) ? filePath.replace(/^[/\\]+|:/g, "") : relative;
  const day = new Date().toISOString().slice(0, 10);
  let backupPath = path.join(target.chainHome, "backups", day, safeRelative);

  if (await pathExists(backupPath)) {
    backupPath = `${backupPath}.${Date.now()}`;
  }

  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

/**
 * Writes a Chain-Hub-generated file, refusing to clobber a file that already
 * exists but isn't itself Chain-Hub-managed (a user's own hand-written file).
 *
 * `force: true` skips that guard — used when Hub owns this kind/name and is
 * projecting into the editor slot (sync/setup/import claim), including when an
 * unmarked twin already sits at that path. That twin is backed up first when
 * `backup` is given.
 */
export async function writeManagedFile(
  filePath: string,
  content: string,
  markerCheck: MarkerCheck = "frontmatter",
  options?: WriteManagedOptions
): Promise<void> {
  if (await pathExists(filePath)) {
    const existing = await fs.readFile(filePath, "utf8");

    if (existing === content) {
      return;
    }

    if (!(await isManaged(existing, markerCheck))) {
      if (!options?.force) {
        console.warn(`[chain-hub] skipping ${filePath}: file exists and is not Chain Hub managed`);
        return;
      }

      if (options.backup) {
        const backupPath = await backupForeignFile(filePath, options.backup);
        console.warn(`[chain-hub] replacing hand-written ${filePath}; backup saved to ${backupPath}`);
      }
    }
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

/** Removes a Chain-Hub-generated file, only if it still carries the ownership marker. */
export async function removeManagedFile(filePath: string, markerCheck: MarkerCheck = "frontmatter"): Promise<void> {
  if (!(await pathExists(filePath))) {
    return;
  }

  const existing = await fs.readFile(filePath, "utf8");

  if (!(await isManaged(existing, markerCheck))) {
    return;
  }

  await fs.unlink(filePath);
}

export async function removeEmptyDir(dirPath: string): Promise<void> {
  const remaining = await fs.readdir(dirPath).catch(() => null);

  if (remaining && remaining.length === 0) {
    await fs.rmdir(dirPath).catch(() => undefined);
  }
}

export async function dirHasAnyFile(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.length > 0;
  } catch {
    return false;
  }
}

/**
 * Removes a projected SKILL.md and, once it is gone, its folder (sidecars included).
 * A hand-written SKILL.md stays put, and so does its folder.
 */
export async function removeProjectedSkill(skillFilePath: string): Promise<void> {
  await removeManagedFile(skillFilePath);
  if (!(await pathExists(skillFilePath))) {
    await removeEditorSkillDirectory(path.dirname(skillFilePath));
  }
}

/** Full rebuild: writes every asset of a supported kind with `force` so Hub claims its projection slots. */
export async function resyncSupportedAssets(
  supportedKinds: AssetKind[],
  assets: AssetDetail[],
  write: (asset: AssetDetail, options: { force: boolean }) => Promise<void>
): Promise<void> {
  for (const asset of assets) {
    if (supportedKinds.includes(asset.kind)) {
      await write(asset, { force: true });
    }
  }
}

/** Standard adapter status: connected once any target directory has content. */
export async function buildIntegrationStatus(params: {
  id: string;
  label: string;
  targetPaths: string[];
  supportedKinds: AssetKind[];
}): Promise<Omit<Integration, "installed">> {
  const connectedFlags = await Promise.all(params.targetPaths.map((dir) => dirHasAnyFile(dir)));
  const connected = connectedFlags.some(Boolean);

  return {
    id: params.id,
    label: params.label,
    targetPaths: params.targetPaths,
    connected,
    mode: connected ? "managed" : "missing",
    supportedKinds: params.supportedKinds,
    unsupportedKinds: assetKinds.filter((kind) => !params.supportedKinds.includes(kind))
  };
}
