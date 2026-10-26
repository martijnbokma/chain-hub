import { promises as fs } from "node:fs";
import path from "node:path";

import type { AssetKind } from "@chain-hub/contracts";

import { pathExists } from "../shared.js";
import { parseFrontmatter } from "./frontmatter.js";
import { hasFrontmatterMarker } from "./marker.js";
import type { DiscoveredCandidate } from "./types.js";

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

    if (hasFrontmatterMarker(parseFrontmatter(raw).data)) {
      continue;
    }

    // Import the file as-is: its frontmatter (description, allowed-tools, agent tools/model,
    // rule globs, …) is part of the asset, not editor noise.
    results.push({ kind, name, content: raw, sourcePath: filePath });
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
