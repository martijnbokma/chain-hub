import path from "node:path";

import { type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { deriveDescription, stringifyFrontmatter } from "./frontmatter.js";
import { projectedFrontmatter } from "./marker.js";
import {
  buildIntegrationStatus,
  listFlatCandidates,
  listSkillCandidates,
  pathExists,
  readUnmanagedCandidates,
  removeManagedFile,
  removeProjectedSkill,
  resyncSupportedAssets,
  writeManagedFile
} from "./files.js";
import { projectSkillSidecars } from "./skill-sidecars.js";
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

/**
 * Where to write a rule or workflow: every root (~/.devin, ~/.windsurf) that already exists,
 * or ~/.devin when neither does — never create the other editor generation's folder.
 */
async function writeTargets(homeDir: string, kind: "rules" | "workflows", name: string): Promise<string[]> {
  const existingRoots: string[] = [];
  for (const root of [NEW_ROOT, LEGACY_ROOT]) {
    if (await pathExists(path.join(homeDir, root))) {
      existingRoots.push(root);
    }
  }
  const roots = existingRoots.length > 0 ? existingRoots : [NEW_ROOT];
  return roots.map((root) => path.join(homeDir, root, kind, `${name}.md`));
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
    (await writeTargets(homeDir, asset.kind, asset.name)).map((filePath) => writeManagedFile(filePath, content, "frontmatter", { ...options, backup: { chainHome, homeDir } }))
  );
}

async function removeAsset(_chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void> {
  if (kind === "skills") {
    await removeProjectedSkill(skillPath(homeDir, name));
    return;
  }

  if (kind !== "rules" && kind !== "workflows") {
    return;
  }

  await Promise.all(targetPaths(homeDir, kind, name).map((filePath) => removeManagedFile(filePath)));
}

async function resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  await resyncSupportedAssets(SUPPORTED_KINDS, assets, (asset, options) => writeAsset(chainHome, homeDir, asset, options));
}

async function status(homeDir: string): Promise<Omit<Integration, "installed">> {
  return buildIntegrationStatus({
    id: "windsurf",
    label: "Windsurf (Devin Desktop)",
    targetPaths: [globalSkillsDir(homeDir), ...baseDirs(homeDir, "rules"), ...baseDirs(homeDir, "workflows")],
    supportedKinds: SUPPORTED_KINDS
  });
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
