import path from "node:path";

import { assetKinds, type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { deriveDescription, stringifyFrontmatter, type FrontmatterData } from "./frontmatter.js";
import { FRONTMATTER_MARKER_KEY, markerSource } from "./marker.js";
import { dirHasAnyFile, removeEmptyDir, removeManagedFile, writeManagedFile } from "./files.js";
import type { EditorAdapter } from "./types.js";

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
  const { body, description } = deriveDescription(asset.content, asset.name);
  const data: FrontmatterData = { [FRONTMATTER_MARKER_KEY]: markerSource(asset.kind, asset.name) };

  // Skills/agents use description for routing; rules are plain always-on instructions in Claude Code.
  if (asset.kind === "skills" || asset.kind === "agents") {
    data.name = asset.name;
    data.description = description;
  }

  return stringifyFrontmatter(data, body);
}

async function writeAsset(_chainHome: string, homeDir: string, asset: AssetDetail): Promise<void> {
  if (!SUPPORTED_KINDS.includes(asset.kind)) {
    return;
  }

  await writeManagedFile(targetPath(homeDir, asset.kind, asset.name), buildContent(asset));
}

async function removeAsset(_chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void> {
  if (!SUPPORTED_KINDS.includes(kind)) {
    return;
  }

  const filePath = targetPath(homeDir, kind, name);
  await removeManagedFile(filePath);

  if (kind === "skills") {
    await removeEmptyDir(path.dirname(filePath));
  }
}

async function resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  for (const asset of assets) {
    if (SUPPORTED_KINDS.includes(asset.kind)) {
      await writeAsset(chainHome, homeDir, asset);
    }
  }
}

async function status(homeDir: string): Promise<Integration> {
  const targetPaths = SUPPORTED_KINDS.map((kind) => baseDir(homeDir, kind));
  const connectedFlags = await Promise.all(targetPaths.map((dir) => dirHasAnyFile(dir)));
  const connected = connectedFlags.some(Boolean);

  return {
    id: "claude-code",
    label: "Claude Code",
    targetPaths,
    connected,
    mode: connected ? "managed" : "missing",
    supportedKinds: SUPPORTED_KINDS,
    unsupportedKinds: assetKinds.filter((kind) => !SUPPORTED_KINDS.includes(kind))
  };
}

export const claudeCodeAdapter: EditorAdapter = {
  id: "claude-code",
  label: "Claude Code",
  supportedKinds: SUPPORTED_KINDS,
  mergeKinds: [],
  status,
  writeAsset,
  removeAsset,
  resync
};
