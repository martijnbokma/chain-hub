import path from "node:path";

import { assetKinds, type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { deriveDescription, stringifyFrontmatter } from "./frontmatter.js";
import { projectedFrontmatter } from "./marker.js";
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

// Windsurf rebranded to "Devin Desktop" (~2026-06-02, confirmed via redirect check —
// see docs/editor-adapters-research.md#windsurf--devin-desktop). Paths are mid-migration:
// - Rules/workflows: dual-write `.devin/` (preferred) and `.windsurf/` (fallback).
// - Skills (global): `~/.codeium/windsurf/skills/<name>/SKILL.md` per Devin Desktop FAQ.
const SUPPORTED_KINDS: AssetKind[] = ["skills", "rules", "workflows"];
const NEW_ROOT = ".devin";
const LEGACY_ROOT = ".windsurf";

function globalSkillsDir(homeDir: string): string {
  return path.join(homeDir, ".codeium", "windsurf", "skills");
}

function skillPath(homeDir: string, name: string): string {
  return path.join(globalSkillsDir(homeDir), name, "SKILL.md");
}

function targetPaths(homeDir: string, kind: "rules" | "workflows", name: string): string[] {
  return [NEW_ROOT, LEGACY_ROOT].map((root) => path.join(homeDir, root, kind, `${name}.md`));
}

function baseDirs(homeDir: string, kind: "rules" | "workflows"): string[] {
  return [NEW_ROOT, LEGACY_ROOT].map((root) => path.join(homeDir, root, kind));
}

function buildContent(asset: AssetDetail): string {
  const { data: source, body, description } = deriveDescription(asset.content, asset.name);

  if (asset.kind === "skills") {
    return stringifyFrontmatter(projectedFrontmatter(asset, source, { name: true, description }), body);
  }

  // Rules: always-on so a synced rule behaves like a persistent instruction by default;
  // a rule that declares `globs` becomes a glob rule instead.
  const defaults = asset.kind === "rules" ? { trigger: "globs" in source ? "glob" : "always_on" } : {};
  return stringifyFrontmatter(projectedFrontmatter(asset, source, { description, defaults }), body);
}

async function writeAsset(chainHome: string, homeDir: string, asset: AssetDetail, options?: { force?: boolean }): Promise<void> {
  if (asset.kind === "skills") {
    const filePath = skillPath(homeDir, asset.name);
    await writeManagedFile(filePath, buildContent(asset), "frontmatter", { ...options, backup: { chainHome, homeDir } });
    await projectSkillSidecars(chainHome, path.dirname(filePath), asset.name);
    return;
  }

  if (asset.kind !== "rules" && asset.kind !== "workflows") {
    return;
  }

  const content = buildContent(asset);
  await Promise.all(
    targetPaths(homeDir, asset.kind, asset.name).map((filePath) => writeManagedFile(filePath, content, "frontmatter", { ...options, backup: { chainHome, homeDir } }))
  );
}

async function removeAsset(_chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void> {
  if (kind === "skills") {
    const filePath = skillPath(homeDir, name);
    await removeManagedFile(filePath);
    if (!(await pathExists(filePath))) {
      await removeEditorSkillDirectory(path.dirname(filePath));
    }
    return;
  }

  if (kind !== "rules" && kind !== "workflows") {
    return;
  }

  await Promise.all(targetPaths(homeDir, kind, name).map((filePath) => removeManagedFile(filePath)));
}

async function resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  for (const asset of assets) {
    if (SUPPORTED_KINDS.includes(asset.kind)) {
      await writeAsset(chainHome, homeDir, asset, { force: true });
    }
  }
}

async function status(homeDir: string): Promise<Omit<Integration, "installed">> {
  const allTargetDirs = [globalSkillsDir(homeDir), ...baseDirs(homeDir, "rules"), ...baseDirs(homeDir, "workflows")];
  const connectedFlags = await Promise.all(allTargetDirs.map((dir) => dirHasAnyFile(dir)));
  const connected = connectedFlags.some(Boolean);

  return {
    id: "windsurf",
    label: "Windsurf (Devin Desktop)",
    targetPaths: allTargetDirs,
    connected,
    mode: connected ? "managed" : "missing",
    supportedKinds: SUPPORTED_KINDS,
    unsupportedKinds: assetKinds.filter((kind) => !SUPPORTED_KINDS.includes(kind))
  };
}

async function discoverKind(homeDir: string, kind: "rules" | "workflows"): Promise<DiscoveredCandidate[]> {
  // Prefer .devin/ (new primary); only fall back to .windsurf/ for names not already found there.
  const primary = await listFlatCandidates(path.join(homeDir, NEW_ROOT, kind), ".md");
  const fallback = await listFlatCandidates(path.join(homeDir, LEGACY_ROOT, kind), ".md");
  const seenNames = new Set(primary.map((candidate) => candidate.name));
  const merged = [...primary, ...fallback.filter((candidate) => !seenNames.has(candidate.name))];

  return readUnmanagedCandidates(merged, kind);
}

async function discover(homeDir: string): Promise<DiscoveredCandidate[]> {
  return [
    ...(await readUnmanagedCandidates(await listSkillCandidates(globalSkillsDir(homeDir)), "skills")),
    ...(await discoverKind(homeDir, "rules")),
    ...(await discoverKind(homeDir, "workflows"))
  ];
}

export const windsurfAdapter: EditorAdapter = {
  id: "windsurf",
  label: "Windsurf (Devin Desktop)",
  supportedKinds: SUPPORTED_KINDS,
  mergeKinds: [],
  status,
  writeAsset,
  removeAsset,
  resync,
  discover
};
