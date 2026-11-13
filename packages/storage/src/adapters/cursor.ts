import path from "node:path";

import { type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { deriveDescription, stringifyFrontmatter } from "./frontmatter.js";
import {
  buildInvokedSkillContent,
  DISABLE_MODEL_INVOCATION,
  removeInvokedSkill,
  writeInvokedSkill
} from "./invoke-skill.js";
import { projectedFrontmatter } from "./marker.js";
import { removeMcpServer, syncMcpServers, writeMcpServer } from "./mcp-config.js";
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

// Cursor discovery paths (user-level): notes/docs/editor-adapters-research.md#cursor
// Agents have no native target — Custom Modes were removed in Cursor 2.1.0.
// Prompts/workflows project as invoke-only skills: .cursor/skills/<name>/SKILL.md
// + disable-model-invocation, matching how Cursor folds Commands into Skills.
// MCP servers merge into ~/.cursor/mcp.json.
const SUPPORTED_KINDS: AssetKind[] = ["skills", "rules", "prompts", "workflows", "mcp"];

function mcpConfigPath(homeDir: string): string {
  return path.join(homeDir, ".cursor", "mcp.json");
}

function baseDir(homeDir: string, kind: "skills" | "rules"): string {
  return path.join(homeDir, ".cursor", kind);
}

function targetPath(homeDir: string, kind: AssetKind, name: string): string {
  if (kind === "skills" || kind === "prompts" || kind === "workflows") {
    return path.join(baseDir(homeDir, "skills"), name, "SKILL.md");
  }

  return path.join(baseDir(homeDir, "rules"), `${name}.mdc`);
}

function buildContent(asset: AssetDetail): string {
  const { data: source, body, description } = deriveDescription(asset.content, asset.name);

  if (asset.kind === "skills") {
    return stringifyFrontmatter(projectedFrontmatter(asset, source, { name: true, description }), body);
  }

  // Rules: default to "Always Apply" so a synced Chain Hub rule behaves like a
  // persistent instruction, matching how it behaves in Claude Code/other editors.
  // A rule that scopes itself with `globs` keeps that scope instead.
  const defaults = "globs" in source ? {} : { alwaysApply: true };
  return stringifyFrontmatter(projectedFrontmatter(asset, source, { description, defaults }), body);
}

async function writeAsset(chainHome: string, homeDir: string, asset: AssetDetail, options?: { force?: boolean }): Promise<void> {
  if (!SUPPORTED_KINDS.includes(asset.kind)) {
    return;
  }

  if (asset.kind === "prompts" || asset.kind === "workflows") {
    const filePath = targetPath(homeDir, asset.kind, asset.name);
    await writeInvokedSkill(filePath, buildInvokedSkillContent(asset, DISABLE_MODEL_INVOCATION), asset, { ...options, backup: { chainHome, homeDir } });
    return;
  }

  if (asset.kind === "mcp") {
    await writeMcpServer(mcpConfigPath(homeDir), asset);
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

  if (kind === "prompts" || kind === "workflows") {
    await removeInvokedSkill(targetPath(homeDir, kind, name), kind, name);
    return;
  }

  if (kind === "mcp") {
    await removeMcpServer(mcpConfigPath(homeDir), name);
    return;
  }

  await removeManagedFile(targetPath(homeDir, kind, name));
}

async function resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  await resyncSupportedAssets(SUPPORTED_KINDS, assets, (asset, options) => writeAsset(chainHome, homeDir, asset, options));
  await syncMcpServers(mcpConfigPath(homeDir), assets.filter((asset) => asset.kind === "mcp"));
}

async function status(homeDir: string): Promise<Omit<Integration, "installed">> {
  return buildIntegrationStatus({
    id: "cursor",
    label: "Cursor",
    targetPaths: [baseDir(homeDir, "skills"), baseDir(homeDir, "rules"), mcpConfigPath(homeDir)],
    supportedKinds: SUPPORTED_KINDS
  });
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
