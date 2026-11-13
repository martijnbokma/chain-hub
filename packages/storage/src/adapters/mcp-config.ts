import { promises as fs } from "node:fs";
import path from "node:path";

import type { AssetDetail } from "@chain-hub/contracts";

import { parseFrontmatter } from "./frontmatter.js";
import { markerSource } from "./marker.js";
import { pathExists } from "./files.js";

// MCP server entries merge into each editor's single shared config file
// (`{"mcpServers": {"<name>": {...}}}` — Claude Code ~/.claude.json, Cursor
// ~/.cursor/mcp.json). Ownership rides inside the entry as `_chain_hub_source`;
// foreign servers are never touched, and resync removes only our own stale entries.
export const MCP_MARKER_KEY = "_chain_hub_source";

interface McpConfigFile {
  mcpServers?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

/** Builds the editor-side MCP server entry from an mcp asset's frontmatter. */
export function buildMcpServerEntry(asset: AssetDetail): Record<string, unknown> {
  const { data } = parseFrontmatter(asset.content);
  const entry: Record<string, unknown> = { [MCP_MARKER_KEY]: markerSource(asset.kind, asset.name) };

  for (const key of ["type", "command", "args", "env", "url", "headers"] as const) {
    if (data[key] !== undefined) {
      entry[key] = data[key];
    }
  }
  return entry;
}

function isManagedEntry(entry: unknown): boolean {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof (entry as Record<string, unknown>)[MCP_MARKER_KEY] === "string"
  );
}

async function readConfig(filePath: string): Promise<McpConfigFile> {
  if (!(await pathExists(filePath))) {
    return {};
  }
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8")) as McpConfigFile;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    // A corrupt editor config must never be clobbered by us — leave it alone.
    console.warn(`[chain-hub] skipping ${filePath}: not valid JSON`);
    return { mcpServers: undefined, __corrupt: true };
  }
}

/**
 * Replaces Chain-Hub-managed entries in `mcpServers` with the current asset
 * set, then writes the file back. Foreign keys and foreign servers survive
 * byte-for-byte in the object graph.
 */
export async function syncMcpServers(filePath: string, assets: AssetDetail[]): Promise<void> {
  const config = await readConfig(filePath);
  if (config.__corrupt) {
    return;
  }
  delete config.__corrupt;

  const servers = { ...(config.mcpServers ?? {}) };
  for (const name of Object.keys(servers)) {
    if (isManagedEntry(servers[name])) {
      delete servers[name];
    }
  }
  for (const asset of assets) {
    servers[asset.name] = buildMcpServerEntry(asset);
  }
  config.mcpServers = servers;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const next = `${JSON.stringify(config, null, 2)}\n`;
  const existing = (await pathExists(filePath)) ? await fs.readFile(filePath, "utf8") : "";
  if (next !== existing) {
    await fs.writeFile(filePath, next, "utf8");
  }
}

/** Upserts one managed server entry — used for single-asset writes. */
export async function writeMcpServer(filePath: string, asset: AssetDetail): Promise<void> {
  const config = await readConfig(filePath);
  if (config.__corrupt) {
    return;
  }
  delete config.__corrupt;

  const servers = { ...(config.mcpServers ?? {}) };
  // Never overwrite a server the user owns under the same name.
  if (servers[asset.name] !== undefined && !isManagedEntry(servers[asset.name])) {
    console.warn(`[chain-hub] skipping ${filePath}: mcpServers.${asset.name} exists and is not Chain Hub managed`);
    return;
  }
  servers[asset.name] = buildMcpServerEntry(asset);
  config.mcpServers = servers;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

/** Removes a managed server entry only — foreign servers under the same name stay. */
export async function removeMcpServer(filePath: string, name: string): Promise<void> {
  const config = await readConfig(filePath);
  if (config.__corrupt) {
    return;
  }
  delete config.__corrupt;

  const servers = config.mcpServers;
  if (!servers || !isManagedEntry(servers[name])) {
    return;
  }
  const next = { ...servers };
  delete next[name];
  config.mcpServers = next;

  await fs.writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
