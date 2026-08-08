import path from "node:path";
import { promises as fs } from "node:fs";

import type { AssetKind } from "@chain-hub/contracts";

import { deriveDescription, parseFrontmatter } from "./frontmatter.js";
import { hasFrontmatterMarker, hasHeaderMarker } from "./marker.js";
import type { DiscoveredCandidate } from "./types.js";

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
 *
 * `force: true` skips that guard — used when Hub owns this kind/name and is
 * projecting into the editor slot (sync/setup/import claim), including when an
 * unmarked twin already sits at that path.
 */
export async function writeManagedFile(
  filePath: string,
  content: string,
  markerCheck: MarkerCheck = "frontmatter",
  options?: { force?: boolean }
): Promise<void> {
  if (!options?.force && (await pathExists(filePath))) {
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

export interface CandidateFile {
  name: string;
  filePath: string;
}

/** Subdirectories of `skillsDir` that contain a SKILL.md — the shape every editor's flat-skills folder uses. */
export async function listSkillCandidates(skillsDir: string): Promise<CandidateFile[]> {
  let entries;

  try {
    entries = await fs.readdir(skillsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: CandidateFile[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const filePath = path.join(skillsDir, entry.name, "SKILL.md");

    if (await pathExists(filePath)) {
      results.push({ name: entry.name, filePath });
    }
  }

  return results;
}

/** Reads each candidate and keeps only the ones that aren't already Chain-Hub-managed. */
export async function readUnmanagedCandidates(candidates: CandidateFile[], kind: AssetKind): Promise<DiscoveredCandidate[]> {
  const results: DiscoveredCandidate[] = [];

  for (const { name, filePath } of candidates) {
    const raw = await fs.readFile(filePath, "utf8");
    const { data, body, description } = deriveDescription(raw, name);

    if (hasFrontmatterMarker(data)) {
      continue;
    }

    // Preserve a human-authored frontmatter `description` that the body itself doesn't
    // already restate as a heading — otherwise it's silently lost on import.
    const bodyHasHeading = /^#{1,6}\s+/.test(body.trim());
    const content = bodyHasHeading || description === name ? body : `# ${description}\n\n${body}`;

    results.push({ kind, name, content, sourcePath: filePath });
  }

  return results;
}

/** Flat files directly under `dir` matching `extension` (e.g. `.md`, `.mdc`), one per rule/workflow. */
export async function listFlatCandidates(dir: string, extension: string): Promise<CandidateFile[]> {
  let entries;

  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: CandidateFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(extension)) {
      continue;
    }

    results.push({ name: entry.name.slice(0, -extension.length), filePath: path.join(dir, entry.name) });
  }

  return results;
}
