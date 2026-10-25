import path from "node:path";

import { assetKinds, type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { deriveDescription, stringifyFrontmatter, type FrontmatterData } from "./frontmatter.js";
import { FRONTMATTER_MARKER_KEY, HEADER_MARKER, markerSource } from "./marker.js";
import {
  dirHasAnyFile,
  listSkillCandidates,
  pathExists,
  readUnmanagedCandidates,
  removeManagedFile,
  writeManagedFile
} from "./files.js";
import { projectSkillSidecars, removeEditorSkillDirectory } from "../skill-install.js";
import type { DiscoveredCandidate, EditorAdapter } from "./types.js";

// Zed discovery paths (user-level): notes/docs/editor-adapters-research.md#zed
// Agents/workflows have no native concept in Zed — intentionally skipped.
// Rules are a MERGE kind: Zed reads exactly one instruction file per scope
// (first match of .rules/AGENTS.md/etc.), so all Chain Hub rule assets get
// concatenated into a single generated ~/.config/zed/AGENTS.md.
const SUPPORTED_KINDS: AssetKind[] = ["skills", "rules"];

function skillsDir(homeDir: string): string {
  return path.join(homeDir, ".agents", "skills");
}

function skillPath(homeDir: string, name: string): string {
  return path.join(skillsDir(homeDir), name, "SKILL.md");
}

function rulesFilePath(homeDir: string): string {
  return path.join(homeDir, ".config", "zed", "AGENTS.md");
}

function buildSkillContent(asset: AssetDetail): string {
  const { body, description } = deriveDescription(asset.content, asset.name);
  const data: FrontmatterData = {
    [FRONTMATTER_MARKER_KEY]: markerSource(asset.kind, asset.name),
    name: asset.name,
    description
  };

  return stringifyFrontmatter(data, body);
}

function buildRulesFileContent(ruleAssets: AssetDetail[]): string {
  if (ruleAssets.length === 0) {
    return `${HEADER_MARKER}\n\n# Chain Hub Rules\n\nNo rules yet.\n`;
  }

  const sections = ruleAssets.map((asset) => {
    const { body, description } = deriveDescription(asset.content, asset.name);
    return `## ${description}\n\n${body}`;
  });

  return `${HEADER_MARKER}\n\n# Chain Hub Rules\n\n${sections.join("\n\n---\n\n")}\n`;
}

async function rebuildRulesFile(homeDir: string, ruleAssets: AssetDetail[], options?: { force?: boolean }): Promise<void> {
  await writeManagedFile(rulesFilePath(homeDir), buildRulesFileContent(ruleAssets), "header", options);
}

async function writeAsset(chainHome: string, homeDir: string, asset: AssetDetail, options?: { force?: boolean }): Promise<void> {
  if (asset.kind === "skills") {
    await writeManagedFile(skillPath(homeDir, asset.name), buildSkillContent(asset), "frontmatter", options);
    await projectSkillSidecars(chainHome, path.dirname(skillPath(homeDir, asset.name)), asset.name);
    return;
  }

  // Rules are a merge kind — syncAssetToEditors routes these through resync()
  // with the full rule list instead of calling writeAsset directly. This branch
  // only exists so a single rules asset write can't silently drop the file.
  if (asset.kind === "rules") {
    await rebuildRulesFile(homeDir, [asset], options);
  }
}

async function removeAsset(_chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void> {
  if (kind === "skills") {
    const filePath = skillPath(homeDir, name);
    await removeManagedFile(filePath);
    if (!(await pathExists(filePath))) {
      await removeEditorSkillDirectory(path.dirname(filePath));
    }
  }
}

async function resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  const skills = assets.filter((asset) => asset.kind === "skills");
  const rules = assets.filter((asset) => asset.kind === "rules");

  for (const skill of skills) {
    await writeAsset(chainHome, homeDir, skill, { force: true });
  }

  await rebuildRulesFile(homeDir, rules, { force: true });
}

async function status(homeDir: string): Promise<Integration> {
  const rulesFile = rulesFilePath(homeDir);
  const hasSkills = await dirHasAnyFile(skillsDir(homeDir));
  const hasRules = await pathExists(rulesFile);
  const connected = hasSkills || hasRules;

  return {
    id: "zed",
    label: "Zed",
    targetPaths: [skillsDir(homeDir), rulesFile],
    connected,
    mode: connected ? "managed" : "missing",
    supportedKinds: SUPPORTED_KINDS,
    unsupportedKinds: assetKinds.filter((kind) => !SUPPORTED_KINDS.includes(kind))
  };
}

// Only skills are discoverable — rules are a merge kind (one generated AGENTS.md), and
// there's no reliable way to split a foreign, hand-written AGENTS.md back into discrete
// named rule assets, so rules are intentionally excluded from discovery.
async function discover(homeDir: string): Promise<DiscoveredCandidate[]> {
  return readUnmanagedCandidates(await listSkillCandidates(skillsDir(homeDir)), "skills");
}

export const zedAdapter: EditorAdapter = {
  id: "zed",
  label: "Zed",
  supportedKinds: SUPPORTED_KINDS,
  mergeKinds: ["rules"],
  status,
  writeAsset,
  removeAsset,
  resync,
  discover
};
