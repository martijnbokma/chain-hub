import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  InvalidInputError,
  type SyncAuthMethod,
  type SyncConfig,
  syncConfigSchema,
  type SyncState,
  syncStateSchema
} from "@chain-hub/contracts";

import { readAiSecrets } from "./ai-settings.js";
import { resolveChainHome } from "./core.js";
import { ghAuthToken } from "./github.js";
import { ensureDir, pathExists, writeFileAtomic } from "./shared.js";

// Config/state persistence plus the path guards for GitHub-backed sync.
// Orchestration lives in sync.ts; layout and rationale:
// notes/docs/specs/hub-cloud-backup-sync.md.

export const DEFAULT_REPO_NAME = "chain-hub-sync";

/**
 * Paths that must never leave the machine — enforced even if .gitignore was
 * edited or a file was already tracked. Directory entries end with "/".
 */
const SYNC_DENYLIST: string[] = [
  "system/secrets.json",
  "system/sync-state.json",
  "logs/",
  "backups/",
];

const GITIGNORE_LINES = [
  "system/secrets.json",
  "system/sync-state.json",
  "logs/",
  "backups/",
  "node_modules/",
  ".DS_Store",
  ".env",
  ".env.*",
];

const GITATTRIBUTES_LINES = ["memory/learnings/events.jsonl merge=union"];

function syncConfigPath(chainHome: string): string {
  return path.join(chainHome, "system", "sync.json");
}

function syncStatePath(chainHome: string): string {
  return path.join(chainHome, "system", "sync-state.json");
}

function isDenied(relPath: string): boolean {
  if (SYNC_DENYLIST.some((entry) => (entry.endsWith("/") ? relPath.startsWith(entry) : relPath === entry))) {
    return true;
  }
  const base = path.posix.basename(relPath);
  return /^\.env($|\.)/.test(base);
}

/** Fail-closed guard: throws when a denylisted path is about to be committed or pushed. */
export function assertNoDenied(paths: string[]): void {
  const denied = paths.filter(isDenied);
  if (denied.length > 0) {
    throw new InvalidInputError(
      `Refusing to sync machine-local files: ${denied.join(", ")}. ` +
        "They are protected by the sync denylist — untrack them (git rm --cached) instead of editing .gitignore."
    );
  }
}

export function safeRelativeGitPath(filePath: string): string {
  if (filePath.includes("..") || filePath.startsWith("/") || filePath.includes("\\") || filePath.includes("\0")) {
    throw new InvalidInputError(`Unsafe sync path: "${filePath}"`);
  }
  return filePath;
}

export async function readSyncConfig(chainHomeInput?: string): Promise<SyncConfig> {
  const chainHome = resolveChainHome(chainHomeInput);
  try {
    const raw = await fs.readFile(syncConfigPath(chainHome), "utf8");
    return syncConfigSchema.parse(JSON.parse(raw));
  } catch {
    return syncConfigSchema.parse({ version: 1 });
  }
}

export async function readSyncState(chainHomeInput?: string): Promise<SyncState> {
  const chainHome = resolveChainHome(chainHomeInput);
  try {
    const raw = await fs.readFile(syncStatePath(chainHome), "utf8");
    return syncStateSchema.parse(JSON.parse(raw));
  } catch {
    return syncStateSchema.parse({ version: 1, machineId: os.hostname() });
  }
}

export async function writeSyncConfig(chainHome: string, config: SyncConfig): Promise<void> {
  await ensureDir(path.join(chainHome, "system"));
  await writeFileAtomic(syncConfigPath(chainHome), `${JSON.stringify(config, null, 2)}\n`);
}

export async function writeSyncState(chainHome: string, state: SyncState): Promise<void> {
  await ensureDir(path.join(chainHome, "system"));
  await writeFileAtomic(syncStatePath(chainHome), `${JSON.stringify(state, null, 2)}\n`);
}

/** Write missing lines into a file that may already exist with user content. */
async function ensureFileLines(filePath: string, required: string[]): Promise<void> {
  let existing = "";
  try {
    existing = await fs.readFile(filePath, "utf8");
  } catch {
    // file does not exist yet
  }
  const present = new Set(existing.split("\n").map((line) => line.trim()));
  const missing = required.filter((line) => !present.has(line));
  if (missing.length === 0) return;
  const content = `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}${missing.join("\n")}\n`;
  await writeFileAtomic(filePath, content);
}

/** The files every synced machine inherits: ignore rules, union merge, manifest. */
export async function ensureSyncFiles(chainHome: string): Promise<void> {
  await ensureFileLines(path.join(chainHome, ".gitignore"), GITIGNORE_LINES);
  await ensureFileLines(path.join(chainHome, ".gitattributes"), GITATTRIBUTES_LINES);
  const manifest = path.join(chainHome, "chain-hub.json");
  if (!(await pathExists(manifest))) {
    await writeFileAtomic(
      manifest,
      `${JSON.stringify({ version: 1, app: "chain-hub", createdAt: new Date().toISOString() }, null, 2)}\n`
    );
  }
}

export async function resolveSyncToken(chainHome: string, method: SyncAuthMethod | null): Promise<string | undefined> {
  if (method === "pat") {
    const token = (await readAiSecrets(chainHome)).githubSyncToken?.trim();
    return token || undefined;
  }
  return (await ghAuthToken()) ?? undefined;
}
