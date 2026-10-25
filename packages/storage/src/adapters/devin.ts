import { promises as fs } from "node:fs";
import path from "node:path";

import { type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { deriveDescription, parseFrontmatter, stringifyFrontmatter } from "./frontmatter.js";
import { FRONTMATTER_MARKER_KEY, markerSource, projectedFrontmatter } from "./marker.js";
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

// Devin CLI discovery paths (user-level): notes/docs/editor-adapters-research.md#devin-cli.
// ~/.devin/ is shared with Devin Desktop (rules/workflows); ~/.config/devin/
// (%APPDATA%\devin on Windows) is the CLI's own config root for skills/agents.
const SUPPORTED_KINDS: AssetKind[] = ["skills", "agents", "rules", "workflows"];
const DEVIN_HOME = ".devin";

/**
 * Devin CLI's config folder: %APPDATA%\devin on Windows, ~/.config/devin on macOS and Linux.
 * Always derived from `homeDir` (never XDG_CONFIG_HOME) so a redirected HOME can't reach the real config.
 */
export function devinConfigDir(homeDir: string, platform: NodeJS.Platform = process.platform): string {
  return platform === "win32"
    ? path.join(homeDir, "AppData", "Roaming", "devin")
    : path.join(homeDir, ".config", "devin");
}

function skillsDir(homeDir: string): string {
  return path.join(devinConfigDir(homeDir), "skills");
}

function agentsDir(homeDir: string): string {
  return path.join(devinConfigDir(homeDir), "agents");
}

function skillPath(homeDir: string, name: string): string {
  return path.join(skillsDir(homeDir), name, "SKILL.md");
}

function sharedPath(homeDir: string, kind: "rules" | "workflows", name: string): string {
  return path.join(homeDir, DEVIN_HOME, kind, `${name}.md`);
}

function buildContent(asset: AssetDetail): string {
  const { data: source, body, description } = deriveDescription(asset.content, asset.name);

  if (asset.kind === "skills" || asset.kind === "agents") {
    return stringifyFrontmatter(projectedFrontmatter(asset, source, { name: true, description }), body);
  }

  // Rules: same frontmatter as .windsurf/rules — always-on by default, a glob rule
  // when the asset declares `globs`.
  const defaults = asset.kind === "rules" ? { trigger: "globs" in source ? "glob" : "always_on" } : {};
  return stringifyFrontmatter(projectedFrontmatter(asset, source, { description, defaults }), body);
}

/**
 * Devin CLI has no workflow file format — the equivalent of a manually invoked
 * workflow is a user-triggered skill (slash command /name). ~/.devin/workflows/
 * still gets a copy for Devin Desktop, which does read it.
 */
function buildWorkflowSkillContent(asset: AssetDetail): string {
  const { data: source, body, description } = deriveDescription(asset.content, asset.name);
  return stringifyFrontmatter(
    projectedFrontmatter(asset, source, { name: true, description, defaults: { triggers: ["user"] } }),
    body
  );
}

async function markerSourceAt(filePath: string): Promise<string | null> {
  if (!(await pathExists(filePath))) {
    return null;
  }
  const { data } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
  const source = data[FRONTMATTER_MARKER_KEY];
  return typeof source === "string" ? source : null;
}

/** A same-named skill asset owns the skills/<name> slot — a workflow must not clobber it. */
async function writeWorkflowSkill(chainHome: string, homeDir: string, asset: AssetDetail, options?: { force?: boolean }): Promise<void> {
  const filePath = skillPath(homeDir, asset.name);

  if ((await markerSourceAt(filePath)) === markerSource("skills", asset.name)) {
    return;
  }

  await writeManagedFile(filePath, buildWorkflowSkillContent(asset), "frontmatter", { ...options, backup: { chainHome, homeDir } });
}

async function removeWorkflowSkill(homeDir: string, name: string): Promise<void> {
  const filePath = skillPath(homeDir, name);

  // Only remove our own workflow projection — never a same-named skill's.
  if ((await markerSourceAt(filePath)) !== markerSource("workflows", name)) {
    return;
  }

  await removeProjectedSkill(filePath);
}

async function writeAsset(chainHome: string, homeDir: string, asset: AssetDetail, options?: { force?: boolean }): Promise<void> {
  if (asset.kind === "skills") {
    const filePath = skillPath(homeDir, asset.name);
    await writeManagedFile(filePath, buildContent(asset), "frontmatter", { ...options, backup: { chainHome, homeDir } });
    await projectSkillSidecars(chainHome, path.dirname(filePath), asset.name);
    return;
  }

  if (asset.kind === "agents") {
    const filePath = path.join(agentsDir(homeDir), `${asset.name}.md`);
    await writeManagedFile(filePath, buildContent(asset), "frontmatter", { ...options, backup: { chainHome, homeDir } });
    return;
  }

  if (asset.kind === "rules") {
    await writeManagedFile(sharedPath(homeDir, "rules", asset.name), buildContent(asset), "frontmatter", { ...options, backup: { chainHome, homeDir } });
    return;
  }

  if (asset.kind === "workflows") {
    await writeManagedFile(sharedPath(homeDir, "workflows", asset.name), buildContent(asset), "frontmatter", { ...options, backup: { chainHome, homeDir } });
    await writeWorkflowSkill(chainHome, homeDir, asset, options);
  }
}

async function removeAsset(_chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void> {
  if (kind === "skills") {
    await removeProjectedSkill(skillPath(homeDir, name));
    return;
  }

  if (kind === "agents") {
    await removeManagedFile(path.join(agentsDir(homeDir), `${name}.md`));
    return;
  }

  if (kind === "rules") {
    await removeManagedFile(sharedPath(homeDir, "rules", name));
    return;
  }

  if (kind === "workflows") {
    await removeManagedFile(sharedPath(homeDir, "workflows", name));
    await removeWorkflowSkill(homeDir, name);
  }
}

async function resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  await resyncSupportedAssets(SUPPORTED_KINDS, assets, (asset, options) => writeAsset(chainHome, homeDir, asset, options));
}

async function status(homeDir: string): Promise<Omit<Integration, "installed">> {
  return buildIntegrationStatus({
    id: "devin",
    label: "Devin CLI",
    targetPaths: [
      skillsDir(homeDir),
      agentsDir(homeDir),
      path.join(homeDir, DEVIN_HOME, "rules"),
      path.join(homeDir, DEVIN_HOME, "workflows")
    ],
    supportedKinds: SUPPORTED_KINDS
  });
}

async function discover(homeDir: string): Promise<DiscoveredCandidate[]> {
  return [
    ...(await readUnmanagedCandidates(await listSkillCandidates(skillsDir(homeDir)), "skills")),
    ...(await readUnmanagedCandidates(await listFlatCandidates(agentsDir(homeDir), ".md"), "agents")),
    ...(await readUnmanagedCandidates(await listFlatCandidates(path.join(homeDir, DEVIN_HOME, "rules"), ".md"), "rules")),
    ...(await readUnmanagedCandidates(await listFlatCandidates(path.join(homeDir, DEVIN_HOME, "workflows"), ".md"), "workflows"))
  ];
}

export const devinAdapter: EditorAdapter = {
  id: "devin",
  label: "Devin CLI",
  supportedKinds: SUPPORTED_KINDS,
  mergeKinds: [],
  status,
  writeAsset,
  removeAsset,
  resync,
  discover
};
