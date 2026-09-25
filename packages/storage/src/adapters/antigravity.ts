import path from "node:path";
import { promises as fs } from "node:fs";

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

// Google Antigravity (2.0 app, IDE and `agy` CLI share ~/.gemini/config/):
// docs/antigravity-adapter-research.md
// Assets are projected into a single Chain-Hub-owned plugin instead of the loose
// global folders, so hand-written files stay untouched and `agy plugin disable chain-hub`
// switches everything off at once. Global rules otherwise only live in the single
// ~/.gemini/GEMINI.md (shared with Gemini CLI), which we intentionally never write.
// Workflows are retired by Antigravity on 2026-11-01 — intentionally skipped.
const SUPPORTED_KINDS: AssetKind[] = ["skills", "agents", "rules"];
const PLUGIN_NAME = "chain-hub";
const RULE_CHAR_LIMIT = 12_000;

type SupportedKind = "skills" | "agents" | "rules";

function isSupported(kind: AssetKind): kind is SupportedKind {
  return SUPPORTED_KINDS.includes(kind);
}

function configDir(homeDir: string): string {
  return path.join(homeDir, ".gemini", "config");
}

function pluginDir(homeDir: string): string {
  return path.join(configDir(homeDir), "plugins", PLUGIN_NAME);
}

function manifestPath(homeDir: string): string {
  return path.join(pluginDir(homeDir), "plugin.json");
}

function baseDir(homeDir: string, kind: SupportedKind): string {
  return path.join(pluginDir(homeDir), kind);
}

function targetPath(homeDir: string, kind: SupportedKind, name: string): string {
  if (kind === "skills") {
    return path.join(baseDir(homeDir, kind), name, "SKILL.md");
  }

  return path.join(baseDir(homeDir, kind), `${name}.md`);
}

function buildManifest(): string {
  const manifest = {
    $schema: "https://antigravity.google/schemas/v1/plugin.json",
    name: PLUGIN_NAME,
    version: "1.0.0",
    description: "Skills, agents and rules synced from Chain Hub (~/.chain-hub). Edit them in Chain Hub, not here."
  };

  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * plugin.json can't carry the frontmatter ownership marker, so ownership is inferred
 * from `name`: write when missing or when it already names our plugin; leave any
 * other manifest alone. Returns false when the folder belongs to someone else.
 */
async function ensureManifest(homeDir: string): Promise<boolean> {
  const filePath = manifestPath(homeDir);

  if (await pathExists(filePath)) {
    try {
      const existing = JSON.parse(await fs.readFile(filePath, "utf8")) as { name?: unknown };
      if (existing.name !== PLUGIN_NAME) {
        console.warn(`[chain-hub] skipping ${pluginDir(homeDir)}: plugin.json does not belong to Chain Hub`);
        return false;
      }
    } catch {
      console.warn(`[chain-hub] skipping ${pluginDir(homeDir)}: plugin.json is not valid JSON`);
      return false;
    }
  }

  await fs.mkdir(pluginDir(homeDir), { recursive: true });
  await fs.writeFile(filePath, buildManifest(), "utf8");
  return true;
}

/** Claude-specific agent fields: a Claude model id or tool name means nothing to a Gemini subagent. */
const CLAUDE_ONLY_AGENT_FIELDS = ["model", "tools"] as const;

function buildContent(asset: AssetDetail): string {
  const { data: source, body, description } = deriveDescription(asset.content, asset.name);

  if (asset.kind === "skills" || asset.kind === "agents") {
    const omit = asset.kind === "agents" ? CLAUDE_ONLY_AGENT_FIELDS : [];
    return stringifyFrontmatter(projectedFrontmatter(asset, source, { name: true, description, omit }), body);
  }

  if (body.length > RULE_CHAR_LIMIT) {
    console.warn(`[chain-hub] rule ${asset.name} exceeds Antigravity's ${RULE_CHAR_LIMIT}-character limit and may be truncated`);
  }

  // Rules: always-on so a synced rule behaves like a persistent instruction, matching Cursor/Windsurf.
  const defaults = { trigger: "globs" in source ? "glob" : "always_on" };
  return stringifyFrontmatter(projectedFrontmatter(asset, source, { description, defaults }), body);
}

async function writeAsset(chainHome: string, homeDir: string, asset: AssetDetail, options?: { force?: boolean }): Promise<void> {
  if (!isSupported(asset.kind) || !(await ensureManifest(homeDir))) {
    return;
  }

  const filePath = targetPath(homeDir, asset.kind, asset.name);
  await writeManagedFile(filePath, buildContent(asset), "frontmatter", { ...options, backup: { chainHome, homeDir } });

  if (asset.kind === "skills") {
    await projectSkillSidecars(chainHome, path.dirname(filePath), asset.name);
  }
}

async function removeAsset(_chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void> {
  if (!isSupported(kind)) {
    return;
  }

  const filePath = targetPath(homeDir, kind, name);
  if (kind === "skills") {
    await removeProjectedSkill(filePath);
    return;
  }

  await removeManagedFile(filePath);
}

async function resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  await resyncSupportedAssets(SUPPORTED_KINDS, assets, (asset, options) => writeAsset(chainHome, homeDir, asset, options));
}

async function status(homeDir: string): Promise<Omit<Integration, "installed">> {
  return buildIntegrationStatus({
    id: "antigravity",
    label: "Google Antigravity",
    targetPaths: SUPPORTED_KINDS.map((kind) => baseDir(homeDir, kind as SupportedKind)),
    supportedKinds: SUPPORTED_KINDS
  });
}

// Import candidates come from the user's own global folders. Other plugins belong to
// their publishers, and ~/.gemini/GEMINI.md can't be split back into named rules.
async function discover(homeDir: string): Promise<DiscoveredCandidate[]> {
  return [
    ...(await readUnmanagedCandidates(await listSkillCandidates(path.join(configDir(homeDir), "skills")), "skills")),
    ...(await readUnmanagedCandidates(await listFlatCandidates(path.join(configDir(homeDir), "agents"), ".md"), "agents"))
  ];
}

export const antigravityAdapter: EditorAdapter = {
  id: "antigravity",
  label: "Google Antigravity",
  supportedKinds: SUPPORTED_KINDS,
  mergeKinds: [],
  status,
  writeAsset,
  removeAsset,
  resync,
  discover
};
