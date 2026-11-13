import { promises as fs } from "node:fs";
import path from "node:path";

import { assetKinds, type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { rebuildAgentsMdFile, RULES_SECTION_START } from "./agents-md.js";
import { hasHeaderMarker } from "./marker.js";
import { pathExists } from "./files.js";
import type { DiscoveredCandidate, EditorAdapter } from "./types.js";

// OpenAI Codex reads global rules from ~/.codex/AGENTS.md (the AAIF standard).
// Hub rules merge into one marked section; user content outside it is kept.
// Skills/prompts/workflows reach Codex through the portable ~/.agents/skills
// dir (agent-skills adapter); agents are intentionally skipped.
const SUPPORTED_KINDS: AssetKind[] = ["rules"];

export function codexDir(homeDir: string): string {
  return path.join(homeDir, ".codex");
}

function rulesFilePath(homeDir: string): string {
  return path.join(codexDir(homeDir), "AGENTS.md");
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
  // Nothing 1:1 to remove — rules rebuild on the next resync.
}

async function resync(_chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  await rebuildAgentsMdFile(rulesFilePath(homeDir), assets.filter((asset) => asset.kind === "rules"));
}

async function status(homeDir: string): Promise<Omit<Integration, "installed">> {
  const rulesFile = rulesFilePath(homeDir);
  const rulesContent = (await pathExists(rulesFile)) ? await fs.readFile(rulesFile, "utf8") : "";
  const connected = rulesContent.includes(RULES_SECTION_START) || hasHeaderMarker(rulesContent);

  return {
    id: "codex",
    label: "OpenAI Codex",
    targetPaths: [rulesFile],
    connected,
    mode: connected ? "managed" : "missing",
    supportedKinds: SUPPORTED_KINDS,
    unsupportedKinds: assetKinds.filter((kind) => !SUPPORTED_KINDS.includes(kind))
  };
}

// Nothing discoverable: there's no reliable way to split a hand-written
// AGENTS.md back into discrete named rule assets.
async function discover(_homeDir: string): Promise<DiscoveredCandidate[]> {
  return [];
}

export const codexAdapter: EditorAdapter = {
  id: "codex",
  label: "OpenAI Codex",
  supportedKinds: SUPPORTED_KINDS,
  mergeKinds: ["rules"],
  status,
  writeAsset,
  removeAsset,
  resync,
  discover
};
