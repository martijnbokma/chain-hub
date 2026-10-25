import { promises as fs } from "node:fs";
import path from "node:path";

import type { SkillLockEntry, SkillsLockFile } from "@chain-hub/contracts";

import { writeFileAtomic } from "./shared.js";

/**
 * Unified install lock (`system/assets-lock.json`): provenance for every
 * upstream-installed asset, keyed `"<kind>/<name>"`. Supersedes the skills-only
 * `skills-lock.json` (notes/docs/specs/hub-catalog.md, decision D2) — that file is
 * migrated in once on first access and ignored afterwards.
 */

export interface InstallLockFile {
  version: 1;
  entries: Record<string, SkillLockEntry>;
}

export function installLockKey(kind: string, name: string): string {
  return `${kind}/${name}`;
}

function installLockPath(chainHome: string): string {
  return path.join(chainHome, "system", "assets-lock.json");
}

function skillsLockPath(chainHome: string): string {
  return path.join(chainHome, "system", "skills-lock.json");
}

/** Prefix of legacy skills-lock files set aside on migration (reported by `chain validate`). */
export const CORRUPT_LEGACY_LOCK_PREFIX = "skills-lock.json.corrupt-";

async function readLegacySkillsLock(chainHome: string): Promise<SkillsLockFile | null> {
  const lockPath = skillsLockPath(chainHome);
  let raw: string;
  try {
    raw = await fs.readFile(lockPath, "utf8");
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SkillsLockFile;
    if (parsed.version !== 1 || typeof parsed.skills !== "object" || parsed.skills === null || Array.isArray(parsed.skills)) {
      throw new Error("Unexpected skills lock shape");
    }
    return parsed;
  } catch {
    // Preserve, never silently destroy: move the unreadable file aside like before.
    const corruptPath = path.join(path.dirname(lockPath), `${CORRUPT_LEGACY_LOCK_PREFIX}${Date.now()}`);
    await fs.rename(lockPath, corruptPath).catch(() => undefined);
    console.warn(`[chain-hub] ${lockPath} could not be read; moved it to ${corruptPath}`);
    return null;
  }
}

/** Prefix of assets-lock files set aside because they could not be read; `chain validate` reports them. */
export const CORRUPT_ASSETS_LOCK_PREFIX = "assets-lock.json.corrupt-";

/** Moves the unreadable lock aside instead of letting the next write blank it. */
async function moveCorruptLock(lockPath: string): Promise<void> {
  const corruptPath = path.join(path.dirname(lockPath), `assets-lock.json.corrupt-${Date.now()}`);
  await fs.rename(lockPath, corruptPath).catch(() => undefined);
  console.warn(`[chain-hub] ${lockPath} could not be read; moved it to ${corruptPath}`);
}

export async function readInstallLock(chainHome: string): Promise<InstallLockFile> {
  const lockPath = installLockPath(chainHome);
  let raw: string | null = null;
  try {
    raw = await fs.readFile(lockPath, "utf8");
  } catch {
    raw = null;
  }

  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as InstallLockFile;
      if (parsed.version !== 1 || typeof parsed.entries !== "object" || parsed.entries === null || Array.isArray(parsed.entries)) {
        throw new Error("Unexpected assets lock shape");
      }
      return parsed;
    } catch {
      await moveCorruptLock(lockPath);
      return { version: 1, entries: {} };
    }
  }

  // First access: fold the legacy skills-only lock into the unified file, then
  // leave the old file on disk (ignored; not deleted — backups are cheap).
  const legacy = await readLegacySkillsLock(chainHome);
  const entries: Record<string, SkillLockEntry> = {};
  if (legacy) {
    for (const [name, entry] of Object.entries(legacy.skills)) {
      entries[installLockKey("skills", name)] = entry;
    }
  }
  const lockFile: InstallLockFile = { version: 1, entries };
  if (legacy) {
    await writeInstallLock(chainHome, lockFile);
  }
  return lockFile;
}

async function writeInstallLock(chainHome: string, lockFile: InstallLockFile): Promise<void> {
  await fs.mkdir(path.dirname(installLockPath(chainHome)), { recursive: true });
  await writeFileAtomic(installLockPath(chainHome), `${JSON.stringify(lockFile, null, 2)}\n`);
}

let lockQueue: Promise<unknown> = Promise.resolve();

/** Serialized read-modify-write so parallel installs never drop each other's entries. */
export function mutateInstallLock<T>(
  chainHome: string,
  mutate: (lockFile: InstallLockFile) => T | Promise<T>
): Promise<T> {
  const run = lockQueue.then(async () => {
    const lockFile = await readInstallLock(chainHome);
    const result = await mutate(lockFile);
    await writeInstallLock(chainHome, lockFile);
    return result;
  });
  lockQueue = run.catch(() => undefined);
  return run;
}

/** Drop the lock entry for `<kind>/<name>` (no write when absent). */
export async function removeInstallLockEntry(chainHome: string, kind: string, name: string): Promise<void> {
  const key = installLockKey(kind, name);
  if (!(await readInstallLock(chainHome)).entries[key]) {
    return;
  }
  await mutateInstallLock(chainHome, (lockFile) => {
    delete lockFile.entries[key];
  });
}
