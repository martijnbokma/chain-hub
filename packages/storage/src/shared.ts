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
