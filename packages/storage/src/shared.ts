import os from "node:os";
import { promises as fs } from "node:fs";

/**
 * Resolves the user's home directory for editor adapter targets. Reads
 * `process.env.HOME` directly rather than `os.homedir()` — under Bun,
 * `os.homedir()` does not re-derive from a `HOME` mutated at runtime, which
 * makes it impossible to redirect in tests. Reading the env var ourselves
 * keeps `chain-hub`'s behavior identical on real machines while staying testable.
 */
export function resolveHomeDir(): string {
  return process.env.HOME && process.env.HOME.trim().length > 0 ? process.env.HOME : os.homedir();
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Writes via a temp file + rename so a crash never leaves a truncated file behind.
 * `mode` applies from the first byte, so secrets are never briefly world-readable.
 */
export async function writeFileAtomic(filePath: string, content: string, mode = 0o644): Promise<void> {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await fs.writeFile(tempPath, content, { encoding: "utf8", mode });
    // Windows can transiently refuse rename-over-existing (AV scan, indexer or
    // another handle on the target) — retry briefly before giving up.
    for (let attempt = 0; ; attempt++) {
      try {
        await fs.rename(tempPath, filePath);
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (attempt >= 10 || (code !== "EPERM" && code !== "EBUSY" && code !== "EEXIST")) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
      }
    }
  } finally {
    await fs.rm(tempPath, { force: true });
  }
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.lstat(target);
    return true;
  } catch {
    return false;
  }
}

export function makeExcerpt(content: string, maxLength = 120): string {
  const stripped = content.replace(/^#{1,6}\s+.+$/m, "").replace(/\n+/g, " ").trim();
  return stripped.length > maxLength ? `${stripped.slice(0, maxLength)}…` : stripped;
}
