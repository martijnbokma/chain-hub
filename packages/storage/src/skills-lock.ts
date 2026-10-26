import path from "node:path";

import {
  type AssetDetail,
  ConflictError,
  normalizeSkillName,
  NotFoundError,
  type SkillLockEntry,
  type SkillsLockFile
} from "@chain-hub/contracts";

import { mutateInstallLock, readInstallLock } from "./install-lock.js";

export type ReadAsset = (chainHome: string, kind: "skills", name: string) => Promise<AssetDetail>;

export function skillDir(chainHome: string, name: string): string {
  return path.join(chainHome, "skills", name);
}

export function skillFile(chainHome: string, name: string): string {
  return path.join(skillDir(chainHome, name), "SKILL.md");
}

/** Prefix of lock files set aside because they could not be read; `chain validate` reports them. */
export const CORRUPT_LOCK_PREFIX = "skills-lock.json.corrupt-";

/**
 * Legacy skills-view over the unified `assets-lock.json` (D2, notes/docs/specs/hub-catalog.md).
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
export function mutateSkillsLock<T>(chainHome: string, mutate: (lockFile: SkillsLockFile) => T | Promise<T>): Promise<T> {
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
 * Detach a skill from its source without removing provenance: the entry stays so the
 * UI can show where it came from and why it was unlinked, but update/check skip it and
 * the copy becomes hub-editable. Errors are cleared — unlinking is the resolution.
 */
export async function unlinkSkill(
  chainHome: string,
  name: string,
  reason: "source-missing" | "manual" = "manual"
): Promise<void> {
  const normalized = normalizeSkillName(name);
  if (!(await readSkillsLock(chainHome)).skills[normalized]) {
    throw new NotFoundError(`No lock entry for ${normalized}`);
  }
  await mutateSkillsLock(chainHome, (lockFile) => {
    const entry = lockFile.skills[normalized];
    if (entry) {
      entry.unlinkedAt = new Date().toISOString();
      entry.unlinkedReason = reason;
      entry.lastCheckError = null;
      entry.lastUpdateError = null;
    }
  });
}

/** Writes the lock entry for a fresh install, keeping the original `installedAt` on reinstalls. */
export function recordSkillInstall(
  chainHome: string,
  name: string,
  fields: (previous: SkillLockEntry | undefined, now: string) => Omit<SkillLockEntry, "installedAt" | "updatedAt">
): Promise<SkillLockEntry> {
  const now = new Date().toISOString();
  return mutateSkillsLock(chainHome, (lockFile) => {
    const previous = lockFile.skills[name];
    const entry: SkillLockEntry = {
      ...fields(previous, now),
      installedAt: previous?.installedAt ?? now,
      updatedAt: now,
      lastCheckError: null,
      lastUpdateError: null,
      unlinkedAt: null,
      unlinkedReason: null
    };
    lockFile.skills[name] = entry;
    return entry;
  });
}

/** Writes/clears a persisted error field on one lock entry (no-op when absent). */
export async function setSkillLockError(
  chainHome: string,
  name: string,
  field: "lastCheckError" | "lastUpdateError",
  message: string | null
): Promise<void> {
  await mutateSkillsLock(chainHome, (lock) => {
    const entry = lock.skills[name];
    if (entry) {
      entry[field] = message;
    }
  }).catch(() => undefined);
}

export const clearSkillLockError = (chainHome: string, name: string, field: "lastCheckError" | "lastUpdateError") =>
  setSkillLockError(chainHome, name, field, null);
