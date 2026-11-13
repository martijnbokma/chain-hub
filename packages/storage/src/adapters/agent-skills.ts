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
import {
  buildIntegrationStatus,
  listSkillCandidates,
  readUnmanagedCandidates,
  removeProjectedSkill,
  resyncSupportedAssets,
  writeManagedFile
} from "./files.js";
import { projectSkillSidecars } from "./skill-sidecars.js";
import type { DiscoveredCandidate, EditorAdapter } from "./types.js";

// ~/.agents/skills is the neutral, cross-tool skills directory from the open
// Agent Skills standard (agentskills.io) — read by Codex, Copilot, Gemini CLI,
// Zed, Junie, Roo and other compliant agents. This adapter owns that directory
// for every consumer at once; editors with richer native surfaces keep their
// own adapter paths too (Claude Code, Cursor, Devin, Windsurf, Antigravity).
// Prompts/workflows land here too — as invoke-only skills (disable-model-invocation),
// the open-standard equivalent of a user-triggered asset.
const SUPPORTED_KINDS: AssetKind[] = ["skills", "prompts", "workflows"];

export function agentSkillsDir(homeDir: string): string {
  return path.join(homeDir, ".agents", "skills");
}

function skillPath(homeDir: string, name: string): string {
  return path.join(agentSkillsDir(homeDir), name, "SKILL.md");
}

function buildSkillContent(asset: AssetDetail): string {
  const { data: source, body, description } = deriveDescription(asset.content, asset.name);
  return stringifyFrontmatter(projectedFrontmatter(asset, source, { name: true, description }), body);
}

async function writeAsset(chainHome: string, homeDir: string, asset: AssetDetail, options?: { force?: boolean }): Promise<void> {
  const filePath = skillPath(homeDir, asset.name);

  if (asset.kind === "prompts" || asset.kind === "workflows") {
    await writeInvokedSkill(filePath, buildInvokedSkillContent(asset, DISABLE_MODEL_INVOCATION), asset, { ...options, backup: { chainHome, homeDir } });
    return;
  }

  if (asset.kind !== "skills") {
    return;
  }
  await writeManagedFile(filePath, buildSkillContent(asset), "frontmatter", { ...options, backup: { chainHome, homeDir } });
  await projectSkillSidecars(chainHome, path.dirname(filePath), asset.name);
}

async function removeAsset(_chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void> {
  if (kind === "skills") {
    await removeProjectedSkill(skillPath(homeDir, name));
    return;
  }
  if (kind === "prompts" || kind === "workflows") {
    await removeInvokedSkill(skillPath(homeDir, name), kind, name);
  }
}

async function resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  await resyncSupportedAssets(SUPPORTED_KINDS, assets, (asset, options) => writeAsset(chainHome, homeDir, asset, options));
}

async function status(homeDir: string): Promise<Omit<Integration, "installed">> {
  return buildIntegrationStatus({
    id: "agent-skills",
    label: "Agent Skills (portable)",
    targetPaths: [agentSkillsDir(homeDir)],
    supportedKinds: SUPPORTED_KINDS
  });
}

async function discover(homeDir: string): Promise<DiscoveredCandidate[]> {
  return readUnmanagedCandidates(await listSkillCandidates(agentSkillsDir(homeDir)), "skills");
}

export const agentSkillsAdapter: EditorAdapter = {
  id: "agent-skills",
  label: "Agent Skills (portable)",
  supportedKinds: SUPPORTED_KINDS,
  mergeKinds: [],
  status,
  writeAsset,
  removeAsset,
  resync,
  discover
};
