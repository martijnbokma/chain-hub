import path from "node:path";

import { assetKinds, type AssetDetail, type AssetKind, type Integration } from "@chain-hub/contracts";

import { deriveDescription, stringifyFrontmatter, type FrontmatterData } from "./frontmatter.js";
import { FRONTMATTER_MARKER_KEY, markerSource } from "./marker.js";
import { dirHasAnyFile, removeManagedFile, writeManagedFile } from "./files.js";
import type { EditorAdapter } from "./types.js";

// Windsurf rebranded to "Devin Desktop" (~2026-06-02, confirmed via redirect check —
// see docs/editor-adapters-research.md#windsurf--devin-desktop). Paths are mid-migration,
// so every write goes to both the new `.devin/` location and the `.windsurf/` fallback.
//
// Skills: a `.devin/skills/` directory exists per the Devin Desktop FAQ, but its file
// format was NOT confirmed by research — intentionally left out of supportedKinds until
// that's verified directly, rather than guessing a format.
const SUPPORTED_KINDS: AssetKind[] = ["rules", "workflows"];
const NEW_ROOT = ".devin";
const LEGACY_ROOT = ".windsurf";

function targetPaths(homeDir: string, kind: "rules" | "workflows", name: string): string[] {
  return [NEW_ROOT, LEGACY_ROOT].map((root) => path.join(homeDir, root, kind, `${name}.md`));
}

function baseDirs(homeDir: string, kind: "rules" | "workflows"): string[] {
  return [NEW_ROOT, LEGACY_ROOT].map((root) => path.join(homeDir, root, kind));
}

function buildContent(asset: AssetDetail): string {
  const { body, description } = deriveDescription(asset.content, asset.name);
  const data: FrontmatterData = {
    [FRONTMATTER_MARKER_KEY]: markerSource(asset.kind, asset.name),
    description
  };

  if (asset.kind === "rules") {
    // Always-on so a synced rule behaves like a persistent instruction by default.
    data.trigger = "always_on";
  }

  return stringifyFrontmatter(data, body);
}

async function writeAsset(_chainHome: string, homeDir: string, asset: AssetDetail): Promise<void> {
  if (asset.kind !== "rules" && asset.kind !== "workflows") {
    return;
  }

  const content = buildContent(asset);
  await Promise.all(targetPaths(homeDir, asset.kind, asset.name).map((filePath) => writeManagedFile(filePath, content)));
}

async function removeAsset(_chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void> {
  if (kind !== "rules" && kind !== "workflows") {
    return;
  }

  await Promise.all(targetPaths(homeDir, kind, name).map((filePath) => removeManagedFile(filePath)));
}

async function resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void> {
  for (const asset of assets) {
    if (SUPPORTED_KINDS.includes(asset.kind)) {
      await writeAsset(chainHome, homeDir, asset);
    }
  }
}

async function status(homeDir: string): Promise<Integration> {
  const allTargetDirs = [...baseDirs(homeDir, "rules"), ...baseDirs(homeDir, "workflows")];
  const connectedFlags = await Promise.all(allTargetDirs.map((dir) => dirHasAnyFile(dir)));
  const connected = connectedFlags.some(Boolean);

  return {
    id: "windsurf",
    label: "Windsurf (Devin Desktop)",
    targetPaths: allTargetDirs,
    connected,
    mode: connected ? "managed" : "missing",
    supportedKinds: SUPPORTED_KINDS,
    unsupportedKinds: assetKinds.filter((kind) => !SUPPORTED_KINDS.includes(kind))
  };
}

export const windsurfAdapter: EditorAdapter = {
  id: "windsurf",
  label: "Windsurf (Devin Desktop)",
  supportedKinds: SUPPORTED_KINDS,
  mergeKinds: [],
  status,
  writeAsset,
  removeAsset,
  resync
};
