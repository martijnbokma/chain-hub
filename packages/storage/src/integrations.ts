import path from "node:path";
import { promises as fs } from "node:fs";

import { assetKinds, type AssetDetail, type AssetKind, type DiscoveredAsset, type ImportAssetInput, type Integration } from "@chain-hub/contracts";

import { createAsset, getAsset, initializeHub, listAssets, resolveChainHome } from "./core.js";
import { EDITOR_ADAPTERS } from "./adapters/index.js";
import { ensureDir, makeExcerpt, pathExists, resolveHomeDir } from "./shared.js";

/**
 * Legacy whole-folder symlink targets. Used as a fallback for any editor id
 * that doesn't have a real EditorAdapter yet, and to clean up old symlinks
 * once an adapter takes over for that id.
 */
const LEGACY_INTEGRATION_TARGETS = [
  { id: "cursor", label: "Cursor", relativeTarget: ".cursor/chain-hub" },
  { id: "claude-code", label: "Claude Code", relativeTarget: ".claude/chain-hub" },
  { id: "windsurf", label: "Windsurf (Devin Desktop)", relativeTarget: ".codeium/windsurf/chain-hub" },
  { id: "zed", label: "Zed", relativeTarget: ".config/zed/chain-hub" }
] as const;

function findAdapter(id: string) {
  return EDITOR_ADAPTERS.find((adapter) => adapter.id === id);
}

async function legacyIntegrationStatus(
  target: (typeof LEGACY_INTEGRATION_TARGETS)[number],
  homeDir: string
): Promise<Integration> {
  const targetPath = path.join(homeDir, target.relativeTarget);
  const connected = await pathExists(targetPath);

  return {
    id: target.id,
    label: target.label,
    targetPaths: [targetPath],
    connected,
    mode: connected ? "symlink" : "missing",
    supportedKinds: [],
    unsupportedKinds: [...assetKinds]
  };
}

/** Removes a legacy whole-folder symlink for `id`, if one still exists — called once an adapter takes over. */
async function removeLegacySymlink(id: string, homeDir: string): Promise<void> {
  const target = LEGACY_INTEGRATION_TARGETS.find((entry) => entry.id === id);

  if (!target) {
    return;
  }

  const targetPath = path.join(homeDir, target.relativeTarget);

  try {
    const stats = await fs.lstat(targetPath);
    if (stats.isSymbolicLink()) {
      await fs.unlink(targetPath);
    }
  } catch {
    // nothing to clean up
  }
}

export async function getIntegrations(chainHomeInput?: string): Promise<Integration[]> {
  const homeDir = resolveHomeDir();

  return Promise.all(
    LEGACY_INTEGRATION_TARGETS.map(async (target) => {
      const adapter = findAdapter(target.id);
      return adapter ? adapter.status(homeDir) : legacyIntegrationStatus(target, homeDir);
    })
  );
}

export async function setupIntegrations(chainHomeInput?: string): Promise<Integration[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  const homeDir = resolveHomeDir();

  await initializeHub(chainHome);
  const assets = await Promise.all(
    (await listAssets(chainHome)).map((record) => getAsset(chainHome, record.kind, record.name))
  );

  await Promise.all(
    LEGACY_INTEGRATION_TARGETS.map(async (target) => {
      const adapter = findAdapter(target.id);

      if (adapter) {
        await removeLegacySymlink(target.id, homeDir);
        await adapter.resync(chainHome, homeDir, assets);
        return;
      }

      const targetPath = path.join(homeDir, target.relativeTarget);
      const targetParent = path.dirname(targetPath);

      await ensureDir(targetParent);

      if (await pathExists(targetPath)) {
        return;
      }

      await fs.symlink(chainHome, targetPath, "dir");
    })
  );

  return getIntegrations(chainHome);
}

/** Pushes a single asset change out to every editor adapter that supports its kind. Never throws — sync failures are logged, not fatal, since the source-of-truth write already succeeded. */
export async function syncAssetToEditors(
  chainHomeInput: string | undefined,
  kind: AssetKind,
  name: string,
  asset: AssetDetail | null
): Promise<void> {
  const chainHome = resolveChainHome(chainHomeInput);
  const homeDir = resolveHomeDir();

  for (const adapter of EDITOR_ADAPTERS) {
    if (!adapter.supportedKinds.includes(kind)) {
      continue;
    }

    try {
      if (adapter.mergeKinds.includes(kind)) {
        // Merge kinds rebuild a single generated file from ALL assets, not just the changed kind —
        // fetch the full list so other supported kinds aren't dropped from the rebuild.
        const assets = await Promise.all(
          (await listAssets(chainHome)).map((record) => getAsset(chainHome, record.kind, record.name))
        );
        await adapter.resync(chainHome, homeDir, assets);
        continue;
      }

      if (asset) {
        await adapter.writeAsset(chainHome, homeDir, asset);
      } else {
        await adapter.removeAsset(chainHome, homeDir, kind, name);
      }
    } catch (error) {
      console.warn(`[chain-hub] editor sync failed for ${adapter.id} (${kind}/${name}):`, error);
    }
  }
}

/** Native editor files that aren't yet Chain-Hub-managed — candidates a user can import into the hub. */
export async function discoverAssets(): Promise<DiscoveredAsset[]> {
  const homeDir = resolveHomeDir();
  const results: DiscoveredAsset[] = [];

  for (const adapter of EDITOR_ADAPTERS) {
    for (const candidate of await adapter.discover(homeDir)) {
      results.push({
        editorId: adapter.id,
        editorLabel: adapter.label,
        kind: candidate.kind,
        name: candidate.name,
        preview: makeExcerpt(candidate.content),
        sourcePath: candidate.sourcePath
      });
    }
  }

  return results;
}

/** Adopts a discovered native file into the hub as a regular managed asset. */
export async function importDiscoveredAsset(chainHomeInput: string | undefined, input: ImportAssetInput): Promise<AssetDetail> {
  const chainHome = resolveChainHome(chainHomeInput);
  const adapter = EDITOR_ADAPTERS.find((candidate) => candidate.id === input.editorId);

  if (!adapter) {
    throw new Error(`Unknown editor: ${input.editorId}`);
  }

  const candidates = await adapter.discover(resolveHomeDir());
  const match = candidates.find((candidate) => candidate.kind === input.kind && candidate.name === input.name);

  if (!match) {
    throw new Error(`No importable ${input.kind}/${input.name} found for ${input.editorId}`);
  }

  const asset = await createAsset(chainHome, { kind: match.kind, name: match.name, content: match.content });

  // Adopt the exact source file: force-write the marker into it so it stops being
  // "foreign" from the origin adapter's point of view. Without this, the regular
  // guarded sync path would (correctly, for any other file) refuse to touch it.
  const homeDir = resolveHomeDir();
  await adapter.writeAsset(chainHome, homeDir, asset, { force: true });

  return asset;
}
