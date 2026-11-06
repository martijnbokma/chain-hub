import { promises as fs } from "node:fs";
import path from "node:path";

import {
  type SecurityScanRecord,
  type SecurityScansFile,
  securityScansFileSchema
} from "@chain-hub/contracts";

import { installLockKey } from "./install-lock.js";
import { writeFileAtomic } from "./shared.js";

/**
 * Persisted scan state in `system/security-scans.json`, keyed `<kind>/<name>`
 * (same key format as assets-lock). One record per asset: latest verdict,
 * findings, and any explicit allow-anyway override.
 */

function scansPath(chainHome: string): string {
  return path.join(chainHome, "system", "security-scans.json");
}

/** Prefix of scan files set aside because they could not be read; `chain validate` reports them. */
export const CORRUPT_SCANS_PREFIX = "security-scans.json.corrupt-";

export async function readSecurityScans(chainHome: string): Promise<SecurityScansFile> {
  const lockPath = scansPath(chainHome);
  let raw: string | null = null;
  try {
    raw = await fs.readFile(lockPath, "utf8");
  } catch {
    return { version: 1, scans: {} };
  }

  try {
    return securityScansFileSchema.parse(JSON.parse(raw));
  } catch {
    const corruptPath = path.join(path.dirname(lockPath), `${CORRUPT_SCANS_PREFIX}${Date.now()}`);
    await fs.rename(lockPath, corruptPath).catch(() => undefined);
    console.warn(`[chain-hub] ${lockPath} could not be read; moved it to ${corruptPath}`);
    return { version: 1, scans: {} };
  }
}

async function writeSecurityScans(chainHome: string, file: SecurityScansFile): Promise<void> {
  await fs.mkdir(path.dirname(scansPath(chainHome)), { recursive: true });
  await writeFileAtomic(scansPath(chainHome), `${JSON.stringify(file, null, 2)}\n`);
}

let scansQueue: Promise<unknown> = Promise.resolve();

/** Serialized read-modify-write — same pattern as the install lock. */
export function mutateSecurityScans<T>(
  chainHome: string,
  mutate: (file: SecurityScansFile) => T | Promise<T>
): Promise<T> {
  const run = scansQueue.then(async () => {
    const file = await readSecurityScans(chainHome);
    const result = await mutate(file);
    await writeSecurityScans(chainHome, file);
    return result;
  });
  scansQueue = run.catch(() => undefined);
  return run;
}

export async function recordSecurityScan(
  chainHome: string,
  kind: string,
  name: string,
  record: SecurityScanRecord
): Promise<SecurityScanRecord> {
  return mutateSecurityScans(chainHome, (file) => {
    file.scans[installLockKey(kind, name)] = record;
    return record;
  });
}

export async function getSecurityScan(
  chainHome: string,
  kind: string,
  name: string
): Promise<SecurityScanRecord | null> {
  return (await readSecurityScans(chainHome)).scans[installLockKey(kind, name)] ?? null;
}

export async function removeSecurityScan(chainHome: string, kind: string, name: string): Promise<void> {
  const key = installLockKey(kind, name);
  if (!(await readSecurityScans(chainHome)).scans[key]) {
    return;
  }
  await mutateSecurityScans(chainHome, (file) => {
    delete file.scans[key];
  });
}

/** Copy a scan record to a forked asset — same content, same verdict. */
export async function copySecurityScan(
  chainHome: string,
  fromKind: string,
  fromName: string,
  toKind: string,
  toName: string
): Promise<void> {
  const fromKey = installLockKey(fromKind, fromName);
  if (!(await readSecurityScans(chainHome)).scans[fromKey]) {
    return;
  }
  await mutateSecurityScans(chainHome, (file) => {
    const record = file.scans[fromKey];
    if (record) {
      file.scans[installLockKey(toKind, toName)] = record;
    }
  });
}

/** Move a scan record when an asset is renamed or converted to another kind. */
export async function renameSecurityScan(
  chainHome: string,
  fromKind: string,
  fromName: string,
  toKind: string,
  toName: string
): Promise<void> {
  const fromKey = installLockKey(fromKind, fromName);
  if (!(await readSecurityScans(chainHome)).scans[fromKey]) {
    return;
  }
  await mutateSecurityScans(chainHome, (file) => {
    const record = file.scans[fromKey];
    if (!record) {
      return;
    }
    delete file.scans[fromKey];
    file.scans[installLockKey(toKind, toName)] = record;
  });
}
