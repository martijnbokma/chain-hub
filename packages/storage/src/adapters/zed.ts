import { promises as fs } from "node:fs";
import path from "node:path";

import { assetKinds, type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { deriveDescription, stringifyFrontmatter } from "./frontmatter.js";
import { hasHeaderMarker, projectedFrontmatter } from "./marker.js";
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

// Zed discovery paths (user-level): docs/editor-adapters-research.md#zed
// Agents/workflows have no native concept in Zed — intentionally skipped.
// Rules are a MERGE kind: Zed reads exactly one instruction file per scope
// (first match of .rules/AGENTS.md/etc.), so all Chain Hub rule assets get
// concatenated into one marked section of ~/.config/zed/AGENTS.md. Anything the
// user wrote outside that section is left alone.
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
  const { data: source, body, description } = deriveDescription(asset.content, asset.name);
  return stringifyFrontmatter(projectedFrontmatter(asset, source, { name: true, description }), body);
}

const SECTION_START = "<!-- chain-hub:rules:start -->";
const SECTION_END = "<!-- chain-hub:rules:end -->";

function buildRulesSection(ruleAssets: AssetDetail[]): string {
  const sections = ruleAssets.map((asset) => {
    const { body, description } = deriveDescription(asset.content, asset.name);
    return `## ${description}\n\n${body.trim()}`;
  });
  const body = sections.length > 0 ? sections.join("\n\n---\n\n") : "No rules yet.";

  return `${SECTION_START}\n# Chain Hub Rules\n\n${body}\n${SECTION_END}`;
}

/** Hand-written text around Chain Hub's section, or "" when the whole file is ours. */
function userContent(existing: string): string {
  if (hasHeaderMarker(existing)) {
    // Files from before sections existed were entirely generated.
    return "";
  }

  const start = existing.indexOf(SECTION_START);
  const end = existing.indexOf(SECTION_END);
  if (start === -1 || end === -1 || end < start) {
    return existing.trim();
  }

  const before = existing.slice(0, start).trim();
  const after = existing.slice(end + SECTION_END.length).trim();
  return [before, after].filter(Boolean).join("\n\n");
}

async function rebuildRulesFile(homeDir: string, ruleAssets: AssetDetail[]): Promise<void> {
  const filePath = rulesFilePath(homeDir);
  const existing = (await pathExists(filePath)) ? await fs.readFile(filePath, "utf8") : "";
  const kept = userContent(existing);

  // Don't add an empty Chain Hub section to someone's own instructions.
  const section = ruleAssets.length === 0 && kept ? "" : buildRulesSection(ruleAssets);
  const next = [kept, section].filter(Boolean).join("\n\n");

  if (!next) {
    return;
  }

  const content = `${next}\n`;
  if (content !== existing) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
  }
}

async function writeAsset(chainHome: string, homeDir: string, asset: AssetDetail, options?: { force?: boolean }): Promise<void> {
  if (asset.kind === "skills") {
    await writeManagedFile(skillPath(homeDir, asset.name), buildSkillContent(asset), "frontmatter", { ...options, backup: { chainHome, homeDir } });
    await projectSkillSidecars(chainHome, path.dirname(skillPath(homeDir, asset.name)), asset.name);
    return;
  }

  // Rules are a merge kind — syncAssetToEditors routes these through resync()
  // with the full rule list instead of calling writeAsset directly. This branch
  // only exists so a single rules asset write can't silently drop the file.
  if (asset.kind === "rules") {
    await rebuildRulesFile(homeDir, [asset]);
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

  await rebuildRulesFile(homeDir, rules);
}

async function status(homeDir: string): Promise<Omit<Integration, "installed">> {
  const rulesFile = rulesFilePath(homeDir);
  const hasSkills = await dirHasAnyFile(skillsDir(homeDir));
  const rulesContent = (await pathExists(rulesFile)) ? await fs.readFile(rulesFile, "utf8") : "";
  const hasRules = rulesContent.includes(SECTION_START) || hasHeaderMarker(rulesContent);
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
