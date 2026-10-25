import path from "node:path";

import { assetKinds, type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { deriveDescription, stringifyFrontmatter, type FrontmatterData } from "./frontmatter.js";
import { FRONTMATTER_MARKER_KEY, markerSource } from "./marker.js";
import {
  dirHasAnyFile,
  listFlatCandidates,
  listSkillCandidates,
  pathExists,
  readUnmanagedCandidates,
  removeManagedFile,
  writeManagedFile
} from "./files.js";
import { projectSkillSidecars, removeEditorSkillDirectory } from "../skill-install.js";
import type { DiscoveredCandidate, EditorAdapter } from "./types.js";

// Cursor discovery paths (user-level): notes/docs/editor-adapters-research.md#cursor
// Agents/workflows have no native target — Custom Modes were removed in Cursor 2.1.0
// and Commands is being folded into Skills, so both kinds are intentionally skipped.
const SUPPORTED_KINDS: AssetKind[] = ["skills", "rules"];

function baseDir(homeDir: string, kind: "skills" | "rules"): string {
  return path.join(homeDir, ".cursor", kind);
}

function targetPath(homeDir: string, kind: "skills" | "rules", name: string): string {
  if (kind === "skills") {
    return path.join(baseDir(homeDir, kind), name, "SKILL.md");
  }

  return path.join(baseDir(homeDir, kind), `${name}.mdc`);
}

function buildContent(asset: AssetDetail): string {
  const { body, description } = deriveDescription(asset.content, asset.name);
  const data: FrontmatterData = { [FRONTMATTER_MARKER_KEY]: markerSource(asset.kind, asset.name) };

  if (asset.kind === "skills") {
    data.name = asset.name;
    data.description = description;
  } else {
    // Rules: default to "Always Apply" so a synced Chain Hub rule behaves like a
    // persistent instruction, matching how it behaves in Claude Code/other editors.
    data.description = description;
    data.alwaysApply = true;
  }

  return stringifyFrontmatter(data, body);
}

async function writeAsset(chainHome: string, homeDir: string, asset: AssetDetail, options?: { force?: boolean }): Promise<void> {
  if (asset.kind !== "skills" && asset.kind !== "rules") {
    return;
  }

  await writeManagedFile(targetPath(homeDir, asset.kind, asset.name), buildContent(asset), "frontmatter", options);

  if (asset.kind === "skills") {
    await projectSkillSidecars(chainHome, path.dirname(targetPath(homeDir, "skills", asset.name)), asset.name);
  }
}

async function removeAsset(_chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void> {
  if (kind !== "skills" && kind !== "rules") {
    return;
  }

  if (kind === "skills") {
    const filePath = targetPath(homeDir, kind, name);
    await removeManagedFile(filePath);
    if (!(await pathExists(filePath))) {
      await removeEditorSkillDirectory(path.dirname(filePath));
    }
    return;
  }

  await removeManagedFile(targetPath(homeDir, kind, name));
}

async function resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  for (const asset of assets) {
    if (SUPPORTED_KINDS.includes(asset.kind)) {
      await writeAsset(chainHome, homeDir, asset, { force: true });
    }
  }
}

async function status(homeDir: string): Promise<Integration> {
  const targetPaths = [baseDir(homeDir, "skills"), baseDir(homeDir, "rules")];
  const connectedFlags = await Promise.all(targetPaths.map((dir) => dirHasAnyFile(dir)));
  const connected = connectedFlags.some(Boolean);

  return {
    id: "cursor",
    label: "Cursor",
    targetPaths,
    connected,
    mode: connected ? "managed" : "missing",
    supportedKinds: SUPPORTED_KINDS,
    unsupportedKinds: assetKinds.filter((kind) => !SUPPORTED_KINDS.includes(kind))
  };
}

async function discover(homeDir: string): Promise<DiscoveredCandidate[]> {
  const results: DiscoveredCandidate[] = [];

  results.push(...(await readUnmanagedCandidates(await listSkillCandidates(baseDir(homeDir, "skills")), "skills")));
  results.push(...(await readUnmanagedCandidates(await listFlatCandidates(baseDir(homeDir, "rules"), ".mdc"), "rules")));

  return results;
}

export const cursorAdapter: EditorAdapter = {
  id: "cursor",
  label: "Cursor",
  supportedKinds: SUPPORTED_KINDS,
  mergeKinds: [],
  status,
  writeAsset,
  removeAsset,
  resync,
  discover
};
