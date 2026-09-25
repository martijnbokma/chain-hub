import path from "node:path";
import { promises as fs } from "node:fs";

import {
  assertSafeRelativeSkillPath,
  InvalidInputError,
  NotFoundError,
  type SkillFileContent,
  type SkillFileEntry
} from "@chain-hub/contracts";

import { assetFilePath, resolveChainHome } from "./core.js";
import { pathExists } from "./shared.js";

// Read-only access to the sidecar files inside a hub skill folder (everything next to SKILL.md).

const MAX_SKILL_FILE_READ_BYTES = 1_000_000;

async function walkSkillDir(baseDir: string, currentDir: string, results: SkillFileEntry[]): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolute = path.join(currentDir, entry.name);
    const relative = path.relative(baseDir, absolute).split(path.sep).join("/");

    if (entry.isDirectory()) {
      results.push({ path: relative, size: 0, isDirectory: true });
      await walkSkillDir(baseDir, absolute, results);
    } else if (entry.isFile() && entry.name !== "SKILL.md") {
      const stats = await fs.stat(absolute);
      results.push({ path: relative, size: stats.size, isDirectory: false });
    }
  }
}

/** Files and subfolders inside a skill's folder, other than SKILL.md itself. */
export async function listSkillFiles(chainHomeInput: string | undefined, name: string): Promise<SkillFileEntry[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  const skillDir = path.dirname(assetFilePath(chainHome, "skills", name));

  if (!(await pathExists(skillDir))) {
    throw new NotFoundError(`Asset not found: skills/${name}`);
  }

  const results: SkillFileEntry[] = [];
  await walkSkillDir(skillDir, skillDir, results);
  results.sort((a, b) => a.path.localeCompare(b.path));
  return results;
}

/** Reads a single sibling file inside a skill's folder. Rejects paths that escape the skill folder. */
export async function readSkillFile(
  chainHomeInput: string | undefined,
  name: string,
  relativePath: string
): Promise<SkillFileContent> {
  const chainHome = resolveChainHome(chainHomeInput);
  const safeRelative = assertSafeRelativeSkillPath(relativePath);
  const skillDir = path.dirname(assetFilePath(chainHome, "skills", name));
  const resolvedSkillDir = path.resolve(skillDir);
  const resolvedTarget = path.resolve(skillDir, safeRelative);

  if (resolvedTarget !== resolvedSkillDir && !resolvedTarget.startsWith(resolvedSkillDir + path.sep)) {
    throw new InvalidInputError(`Unsafe skill file path: ${relativePath}`);
  }

  // Lexical checks don't see symlinks: resolve both sides and refuse anything that lands outside.
  const realSkillDir = await fs.realpath(resolvedSkillDir);
  const realTarget = await fs.realpath(resolvedTarget).catch(() => null);
  if (!realTarget) {
    throw new NotFoundError(`Skill file not found: ${relativePath}`);
  }
  if (!realTarget.startsWith(realSkillDir + path.sep)) {
    throw new InvalidInputError(`Unsafe skill file path: ${relativePath}`);
  }

  const stats = await fs.stat(realTarget);
  if (!stats.isFile()) {
    throw new InvalidInputError(`Not a file: ${relativePath}`);
  }

  const truncated = stats.size > MAX_SKILL_FILE_READ_BYTES;
  const handle = await fs.open(realTarget, "r");
  try {
    const readLength = Math.min(stats.size, MAX_SKILL_FILE_READ_BYTES);
    const buffer = Buffer.alloc(readLength);
    await handle.read(buffer, 0, readLength, 0);
    return { path: safeRelative, content: buffer.toString("utf8"), size: stats.size, truncated };
  } finally {
    await handle.close();
  }
}
