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

// Claude Code discovery paths (user-level): docs/editor-adapters-research.md#claude-code
const SUPPORTED_KINDS: AssetKind[] = ["skills", "agents", "rules"];

function baseDir(homeDir: string, kind: AssetKind): string {
  return path.join(homeDir, ".claude", kind);
}

function targetPath(homeDir: string, kind: AssetKind, name: string): string {
  if (kind === "skills") {
    return path.join(baseDir(homeDir, kind), name, "SKILL.md");
  }

  return path.join(baseDir(homeDir, kind), `${name}.md`);
}

function buildContent(asset: AssetDetail): string {
  const { data: source, body, description } = deriveDescription(asset.content, asset.name);

  // Skills/agents use description for routing; rules are plain always-on instructions in Claude Code.
  const routed = asset.kind === "skills" || asset.kind === "agents";
  const data = routed
    ? projectedFrontmatter(asset, source, { name: true, description })
    : projectedFrontmatter(asset, source, {});

  return stringifyFrontmatter(data, body);
}

async function writeAsset(chainHome: string, homeDir: string, asset: AssetDetail, options?: { force?: boolean }): Promise<void> {
  if (!SUPPORTED_KINDS.includes(asset.kind)) {
    return;
  }

  await writeManagedFile(targetPath(homeDir, asset.kind, asset.name), buildContent(asset), "frontmatter", { ...options, backup: { chainHome, homeDir } });

  if (asset.kind === "skills") {
    await projectSkillSidecars(chainHome, path.dirname(targetPath(homeDir, "skills", asset.name)), asset.name);
  }
}

async function removeAsset(_chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void> {
  if (!SUPPORTED_KINDS.includes(kind)) {
    return;
  }

  if (kind === "skills") {
    await removeProjectedSkill(targetPath(homeDir, kind, name));
    return;
  }

  await removeManagedFile(targetPath(homeDir, kind, name));
}

async function resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  await resyncSupportedAssets(SUPPORTED_KINDS, assets, (asset, options) => writeAsset(chainHome, homeDir, asset, options));
}

async function status(homeDir: string): Promise<Omit<Integration, "installed">> {
  return buildIntegrationStatus({
    id: "claude-code",
    label: "Claude Code",
    targetPaths: SUPPORTED_KINDS.map((kind) => baseDir(homeDir, kind)),
    supportedKinds: SUPPORTED_KINDS
  });
}

async function discover(homeDir: string): Promise<DiscoveredCandidate[]> {
  const results: DiscoveredCandidate[] = [];

  results.push(...(await readUnmanagedCandidates(await listSkillCandidates(baseDir(homeDir, "skills")), "skills")));
  results.push(...(await readUnmanagedCandidates(await listFlatCandidates(baseDir(homeDir, "agents"), ".md"), "agents")));
  results.push(...(await readUnmanagedCandidates(await listFlatCandidates(baseDir(homeDir, "rules"), ".md"), "rules")));

  return results;
}

export const claudeCodeAdapter: EditorAdapter = {
  id: "claude-code",
  label: "Claude Code",
  supportedKinds: SUPPORTED_KINDS,
  mergeKinds: [],
  status,
  writeAsset,
  removeAsset,
  resync,
  discover
};
