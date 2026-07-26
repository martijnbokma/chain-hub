import path from "node:path";
import { promises as fs } from "node:fs";

import { parseFrontmatter } from "./frontmatter.js";
import { hasFrontmatterMarker, hasHeaderMarker } from "./marker.js";

export type MarkerCheck = "frontmatter" | "header";

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.lstat(target);
    return true;
  } catch {
    return false;
  }
}

async function isManaged(content: string, markerCheck: MarkerCheck): Promise<boolean> {
  return markerCheck === "frontmatter" ? hasFrontmatterMarker(parseFrontmatter(content).data) : hasHeaderMarker(content);
}

/**
 * Writes a Chain-Hub-generated file, refusing to clobber a file that already
 * exists but isn't itself Chain-Hub-managed (a user's own hand-written file).
 */
export async function writeManagedFile(filePath: string, content: string, markerCheck: MarkerCheck = "frontmatter"): Promise<void> {
  if (await pathExists(filePath)) {
    const existing = await fs.readFile(filePath, "utf8");
    if (!(await isManaged(existing, markerCheck))) {
      console.warn(`[chain-hub] skipping ${filePath}: file exists and is not Chain Hub managed`);
      return;
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
