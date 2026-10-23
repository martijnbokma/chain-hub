import path from "node:path";

import { type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { deriveDescription, stringifyFrontmatter } from "./frontmatter.js";
import { projectedFrontmatter } from "./marker.js";
import {
  buildIntegrationStatus,
  listFlatCandidates,
  listSkillCandidates,
  readUnmanagedCandidates,
  removeManagedFile,
  removeProjectedSkill,
  resyncSupportedAssets,
  writeManagedFile
} from "./files.js";
import { projectSkillSidecars } from "./skill-sidecars.js";
import type { DiscoveredCandidate, EditorAdapter } from "./types.js";

// Windsurf legacy paths — the product rebranded to "Devin Desktop" and Devin-generation
// paths (~/.devin/, ~/.config/devin/) are owned by the devin adapter (see devin.ts).
// These legacy locations are still read by Devin Desktop and imported by Devin CLI
// (read_config_from.windsurf), so old Windsurf installs keep working.
// - Rules/workflows: `~/.windsurf/{rules,workflows}/<name>.md`
// - Skills (global): `~/.codeium/windsurf/skills/<name>/SKILL.md` per Devin Desktop FAQ.
const SUPPORTED_KINDS: AssetKind[] = ["skills", "rules", "workflows"];
const LEGACY_ROOT = ".windsurf";

function globalSkillsDir(homeDir: string): string {
  return path.join(homeDir, ".codeium", "windsurf", "skills");
}

function skillPath(homeDir: string, name: string): string {
  return path.join(globalSkillsDir(homeDir), name, "SKILL.md");
}

function baseDir(homeDir: string, kind: "rules" | "workflows"): string {
  return path.join(homeDir, LEGACY_ROOT, kind);
}

function targetPath(homeDir: string, kind: "rules" | "workflows", name: string): string {
  return path.join(baseDir(homeDir, kind), `${name}.md`);
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

  await writeManagedFile(targetPath(homeDir, asset.kind, asset.name), buildContent(asset), "frontmatter", { ...options, backup: { chainHome, homeDir } });
}

async function removeAsset(_chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void> {
  if (kind === "skills") {
    await removeProjectedSkill(skillPath(homeDir, name));
    return;
  }

  if (kind !== "rules" && kind !== "workflows") {
    return;
  }

  await removeManagedFile(targetPath(homeDir, kind, name));
}

async function resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  await resyncSupportedAssets(SUPPORTED_KINDS, assets, (asset, options) => writeAsset(chainHome, homeDir, asset, options));
}

async function status(homeDir: string): Promise<Omit<Integration, "installed">> {
  return buildIntegrationStatus({
    id: "windsurf",
    label: "Windsurf (Devin Desktop)",
    targetPaths: [globalSkillsDir(homeDir), baseDir(homeDir, "rules"), baseDir(homeDir, "workflows")],
    supportedKinds: SUPPORTED_KINDS
  });
}

async function discover(homeDir: string): Promise<DiscoveredCandidate[]> {
  return [
    ...(await readUnmanagedCandidates(await listSkillCandidates(globalSkillsDir(homeDir)), "skills")),
    ...(await readUnmanagedCandidates(await listFlatCandidates(baseDir(homeDir, "rules"), ".md"), "rules")),
    ...(await readUnmanagedCandidates(await listFlatCandidates(baseDir(homeDir, "workflows"), ".md"), "workflows"))
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
