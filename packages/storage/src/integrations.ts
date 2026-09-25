import path from "node:path";
import { promises as fs } from "node:fs";

import {
  type AssetDetail,
  type AssetKind,
  assetKinds,
  type DiscoveredAsset,
  type ImportAssetInput,
  type Integration,
  InvalidInputError,
  NotFoundError
} from "@chain-hub/contracts";

import { createAsset, getAsset, listAssets, loadAllAssetDetails, resolveChainHome } from "./core.js";
import { EDITOR_ADAPTERS } from "./adapters/index.js";
import { zedConfigDir } from "./adapters/zed.js";
import { parseFrontmatter } from "./adapters/frontmatter.js";
import { copySkillSidecars } from "./skill-copy.js";
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
  { id: "zed", label: "Zed", relativeTarget: ".config/zed/chain-hub" },
  // No legacy symlink ever existed for Antigravity; removeLegacySymlink only unlinks symlinks, so this is inert.
  { id: "antigravity", label: "Google Antigravity", relativeTarget: ".gemini/config/plugins/chain-hub" }
] as const;

/**
 * Config folders that show an editor is installed. Chain Hub only projects into
 * editors found here, so it never creates ~/.gemini or ~/.config/zed for editors
 * the user doesn't have.
 */
const EDITOR_CONFIG_ROOTS: Record<string, string[]> = {
  cursor: [".cursor"],
  "claude-code": [".claude"],
  windsurf: [".codeium/windsurf", ".windsurf", ".devin"],
  antigravity: [".gemini"]
};

export async function isEditorInstalled(id: string, homeDir: string): Promise<boolean> {
  if (id === "zed") {
    // Zed's config folder is platform specific (%APPDATA%\Zed on Windows).
    return pathExists(zedConfigDir(homeDir));
  }

  for (const root of EDITOR_CONFIG_ROOTS[id] ?? []) {
    if (await pathExists(path.join(homeDir, root))) {
      return true;
    }
  }
  return false;
}

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
    installed: await isEditorInstalled(target.id, homeDir),
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

export async function getIntegrations(_chainHomeInput?: string): Promise<Integration[]> {
  const homeDir = resolveHomeDir();

  return Promise.all(
    LEGACY_INTEGRATION_TARGETS.map(async (target) => {
      const adapter = findAdapter(target.id);
      if (!adapter) {
        return legacyIntegrationStatus(target, homeDir);
      }
      return { ...(await adapter.status(homeDir)), installed: await isEditorInstalled(target.id, homeDir) };
    })
  );
}

export async function setupIntegrations(chainHomeInput?: string): Promise<Integration[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  const homeDir = resolveHomeDir();

  const assets = await loadAllAssetDetails(chainHome);

  // Run adapters sequentially — parallel resync races when editor paths alias the same
  // directory (e.g. ~/.claude/skills/foo symlinked to ~/.agents/skills/foo).
  for (const target of LEGACY_INTEGRATION_TARGETS) {
    if (!(await isEditorInstalled(target.id, homeDir))) {
      continue;
    }

    try {
      const adapter = findAdapter(target.id);

      if (adapter) {
        await removeLegacySymlink(target.id, homeDir);
        await adapter.resync(chainHome, homeDir, assets);
        continue;
      }

      const targetPath = path.join(homeDir, target.relativeTarget);
      const targetParent = path.dirname(targetPath);

      await ensureDir(targetParent);

      if (await pathExists(targetPath)) {
        continue;
      }

      await fs.symlink(chainHome, targetPath, "dir");
    } catch (error) {
      console.warn(`[chain-hub] editor setup failed for ${target.id}:`, error);
    }
  }

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

  // Loaded at most once per change and shared by every adapter that merges this kind.
  let allAssets: Promise<AssetDetail[]> | null = null;

  for (const adapter of EDITOR_ADAPTERS) {
    if (!adapter.supportedKinds.includes(kind) || !(await isEditorInstalled(adapter.id, homeDir))) {
      continue;
    }

    try {
      if (adapter.mergeKinds.includes(kind)) {
        // Merge kinds rebuild a single generated file from ALL assets, not just the changed kind —
        // fetch the full list so other supported kinds aren't dropped from the rebuild.
        allAssets ??= loadAllAssetDetails(chainHome);
        await adapter.resync(chainHome, homeDir, await allAssets);
        continue;
      }

      if (asset) {
        // Hub owns this kind/name — claim the editor projection slot even if an
        // unmarked twin already exists there (Hub is source of truth).
        await adapter.writeAsset(chainHome, homeDir, asset, { force: true });
      } else {
        await adapter.removeAsset(chainHome, homeDir, kind, name);
      }
    } catch (error) {
      console.warn(`[chain-hub] editor sync failed for ${adapter.id} (${kind}/${name}):`, error);
    }
  }
}

/**
 * Native editor files that aren't yet in the hub — import candidates.
 * Skips: (1) Chain-Hub-managed editor files (adapter marker), and
 * (2) any kind/name that already exists in the hub inventory (even if the
 * editor copy is still unmarked — those can't be imported without colliding).
 */
export async function discoverAssets(chainHomeInput?: string): Promise<DiscoveredAsset[]> {
  const chainHome = resolveChainHome(chainHomeInput);
  const homeDir = resolveHomeDir();
  const hubKeys = new Set((await listAssets(chainHome)).map((asset) => `${asset.kind}/${asset.name}`));
  const results: DiscoveredAsset[] = [];

  for (const adapter of EDITOR_ADAPTERS) {
    for (const candidate of await adapter.discover(homeDir)) {
      if (hubKeys.has(`${candidate.kind}/${candidate.name}`)) {
        continue;
      }

      results.push({
        editorId: adapter.id,
        editorLabel: adapter.label,
        kind: candidate.kind,
        name: candidate.name,
        preview: makeExcerpt(parseFrontmatter(candidate.content).body),
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
    throw new InvalidInputError(`Unknown editor: ${input.editorId}`);
  }

  const candidates = await adapter.discover(resolveHomeDir());
  const match = candidates.find((candidate) => candidate.kind === input.kind && candidate.name === input.name);

  if (!match) {
    throw new NotFoundError(`No importable ${input.kind}/${input.name} found for ${input.editorId}`);
  }

  const asset = await createAsset(chainHome, { kind: match.kind, name: match.name, content: match.content });

  if (asset.kind === "skills") {
    // Scripts and references travel with the skill, so every other editor gets a working copy.
    await copySkillSidecars(path.dirname(match.sourcePath), path.dirname(path.join(chainHome, asset.relativePath)));
  }

  // Adopt the exact source file: force-write the marker into it so it stops being
  // "foreign" from the origin adapter's point of view. Hub sync also force-claims
  // projection slots, but import must claim the source even before a full resync.
  const homeDir = resolveHomeDir();
  await adapter.writeAsset(chainHome, homeDir, asset, { force: true });

  return asset.kind === "skills" ? getAsset(chainHome, asset.kind, asset.name) : asset;
}
