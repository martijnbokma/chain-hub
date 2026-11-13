import { promises as fs } from "node:fs";
import path from "node:path";

import { assetKinds, type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { rebuildAgentsMdFile, RULES_SECTION_START } from "./agents-md.js";
import { hasHeaderMarker } from "./marker.js";
import { pathExists } from "./files.js";
import type { DiscoveredCandidate, EditorAdapter } from "./types.js";

// Zed discovery paths (user-level): notes/docs/editor-adapters-research.md#zed
// Zed reads skills from the shared ~/.agents/skills directory — the
// agent-skills adapter owns that target, so this adapter only handles rules.
// Agents/workflows have no native concept in Zed — intentionally skipped.
// Rules are a MERGE kind: Zed reads exactly one instruction file per scope
// (first match of .rules/AGENTS.md/etc.), so all Chain Hub rule assets get
// concatenated into one marked section of <Zed config>/AGENTS.md (see zedConfigDir). Anything the
// user wrote outside that section is left alone.
const SUPPORTED_KINDS: AssetKind[] = ["rules"];

/**
 * Zed's config folder: %APPDATA%\Zed on Windows, ~/.config/zed on macOS and Linux.
 * Always derived from `homeDir` (never XDG_CONFIG_HOME) so a redirected HOME can't reach the real config.
 */
export function zedConfigDir(homeDir: string, platform: NodeJS.Platform = process.platform): string {
  return platform === "win32"
    ? path.join(homeDir, "AppData", "Roaming", "Zed")
    : path.join(homeDir, ".config", "zed");
}

function rulesFilePath(homeDir: string): string {
  return path.join(zedConfigDir(homeDir), "AGENTS.md");
}




async function writeAsset(_chainHome: string, homeDir: string, asset: AssetDetail, _options?: { force?: boolean }): Promise<void> {
  // Rules are a merge kind — syncAssetToEditors routes these through resync()
  // with the full rule list instead of calling writeAsset directly. This branch
  // only exists so a single rules asset write can't silently drop the file.
  if (asset.kind === "rules") {
    await rebuildAgentsMdFile(rulesFilePath(homeDir), [asset]);
  }
}

async function removeAsset(_chainHome: string, _homeDir: string, _kind: AssetKind, _name: string): Promise<void> {
  // Nothing 1:1 to remove — rules rebuild on the next resync; skills belong to agent-skills.
}

async function resync(_chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  await rebuildAgentsMdFile(rulesFilePath(homeDir), assets.filter((asset) => asset.kind === "rules"));
}

async function status(homeDir: string): Promise<Omit<Integration, "installed">> {
  const rulesFile = rulesFilePath(homeDir);
  const rulesContent = (await pathExists(rulesFile)) ? await fs.readFile(rulesFile, "utf8") : "";
  const connected = rulesContent.includes(RULES_SECTION_START) || hasHeaderMarker(rulesContent);

  return {
    id: "zed",
    label: "Zed",
    targetPaths: [rulesFile],
    connected,
    mode: connected ? "managed" : "missing",
    supportedKinds: SUPPORTED_KINDS,
    unsupportedKinds: assetKinds.filter((kind) => !SUPPORTED_KINDS.includes(kind))
  };
}

// Nothing discoverable: skills under ~/.agents/skills belong to the agent-skills
// adapter, and there's no reliable way to split a foreign, hand-written AGENTS.md
// back into discrete named rule assets.
async function discover(_homeDir: string): Promise<DiscoveredCandidate[]> {
  return [];
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
