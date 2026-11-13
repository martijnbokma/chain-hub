import { promises as fs } from "node:fs";
import path from "node:path";

import type { AssetDetail } from "@chain-hub/contracts";

import { parseFrontmatter } from "./frontmatter.js";
import { markerSource } from "./marker.js";
import { pathExists } from "./files.js";

// Hooks are event-driven automation: editor settings point at a command that
// fires on an event (Claude Code settings.json `hooks`, Cursor hooks.json).
// A hub hook asset = frontmatter declaration (event, matcher, timeout) + a
// script body. Projection writes the script under the editor's hooks dir and
// merges a marked entry into the editor's hooks config — `_chain_hub_source`
// marks ownership inside the entry; foreign hook entries are never touched.
export const HOOK_MARKER_KEY = "_chain_hub_source";
const SCRIPT_MARKER = "# chain-hub:managed";

interface HookEntry {
  matcher?: string;
  hooks: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

interface HooksConfigFile {
  hooks?: Record<string, HookEntry[]>;
  [key: string]: unknown;
}

export function hookScriptPath(hooksDir: string, name: string): string {
  return path.join(hooksDir, `${name}.sh`);
}

/** Script file content: marker comment + the asset's script body. */
export function buildHookScript(asset: AssetDetail): string {
  const { body } = parseFrontmatter(asset.content);
  return `#!/bin/sh\n${SCRIPT_MARKER}\n${body.trim()}\n`;
}

/** Settings entry for one hook asset, per the Claude Code hooks schema. */
export function buildHookEntry(asset: AssetDetail, scriptPath: string): { event: string; entry: HookEntry } {
  const { data } = parseFrontmatter(asset.content);
  const event = typeof data.event === "string" ? data.event : "PreToolUse";
  const hook: Record<string, unknown> = { type: "command", command: scriptPath };
  if (typeof data.timeout === "number") {
    hook.timeout = data.timeout;
  }
  const entry: HookEntry = { hooks: [hook], [HOOK_MARKER_KEY]: markerSource(asset.kind, asset.name) };
  if (typeof data.matcher === "string" && data.matcher.length > 0) {
    entry.matcher = data.matcher;
  }
  return { event, entry };
}

function isManagedEntry(entry: unknown): boolean {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof (entry as Record<string, unknown>)[HOOK_MARKER_KEY] === "string"
  );
}

async function readConfig(filePath: string): Promise<{ config: HooksConfigFile; corrupt: boolean }> {
  if (!(await pathExists(filePath))) {
    return { config: {}, corrupt: false };
  }
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8")) as HooksConfigFile;
    return { config: typeof parsed === "object" && parsed !== null ? parsed : {}, corrupt: false };
  } catch {
    console.warn(`[chain-hub] skipping ${filePath}: not valid JSON`);
    return { config: {}, corrupt: true };
  }
}

async function writeConfig(filePath: string, config: HooksConfigFile): Promise<void> {
  const next = `${JSON.stringify(config, null, 2)}\n`;
  const existing = (await pathExists(filePath)) ? await fs.readFile(filePath, "utf8") : "";
  if (next !== existing) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, next, "utf8");
  }
}

async function writeScriptFile(filePath: string, content: string): Promise<void> {
  if ((await pathExists(filePath)) && (await fs.readFile(filePath, "utf8")) === content) {
    return;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, { mode: 0o755 });
}

/** Removes a managed script file (first-line marker) — foreign files stay. */
async function removeScriptFile(filePath: string): Promise<void> {
  if (!(await pathExists(filePath))) {
    return;
  }
  const existing = await fs.readFile(filePath, "utf8");
  if (existing.includes(SCRIPT_MARKER)) {
    await fs.unlink(filePath);
  }
}

/** Upserts one hook: script file + marked settings entry under its event. */
export async function writeHook(settingsPath: string, hooksDir: string, asset: AssetDetail): Promise<void> {
  const { config, corrupt } = await readConfig(settingsPath);
  if (corrupt) {
    return;
  }
  const scriptPath = hookScriptPath(hooksDir, asset.name);
  const { event, entry } = buildHookEntry(asset, scriptPath);

  const hooks = { ...(config.hooks ?? {}) };
  for (const key of Object.keys(hooks)) {
    hooks[key] = (hooks[key] ?? []).filter(
      (item) => !isManagedEntry(item) || item[HOOK_MARKER_KEY] !== markerSource(asset.kind, asset.name)
    );
  }
  hooks[event] = [...(hooks[event] ?? []), entry];
  config.hooks = hooks;

  await writeScriptFile(scriptPath, buildHookScript(asset));
  await writeConfig(settingsPath, config);
}

/** Removes the hook's script file and its settings entry, if managed. */
export async function removeHook(settingsPath: string, hooksDir: string, kind: string, name: string): Promise<void> {
  const { config, corrupt } = await readConfig(settingsPath);
  if (!corrupt && config.hooks) {
    let changed = false;
    const hooks = { ...config.hooks };
    for (const key of Object.keys(hooks)) {
      const kept = (hooks[key] ?? []).filter(
        (item) => !isManagedEntry(item) || item[HOOK_MARKER_KEY] !== markerSource(kind as AssetDetail["kind"], name)
      );
      if (kept.length !== (hooks[key]?.length ?? 0)) {
        changed = true;
        if (kept.length === 0) {
          delete hooks[key];
        } else {
          hooks[key] = kept;
        }
      }
    }
    if (changed) {
      config.hooks = hooks;
      await writeConfig(settingsPath, config);
    }
  }
  await removeScriptFile(hookScriptPath(hooksDir, name));
}

/** Full rebuild: removes all managed entries, writes every current asset. */
export async function syncHooks(settingsPath: string, hooksDir: string, assets: AssetDetail[]): Promise<void> {
  const { config, corrupt } = await readConfig(settingsPath);
  if (corrupt) {
    return;
  }
  const hooks = { ...(config.hooks ?? {}) };
  for (const key of Object.keys(hooks)) {
    const kept = (hooks[key] ?? []).filter((item) => !isManagedEntry(item));
    if (kept.length === 0) {
      delete hooks[key];
    } else {
      hooks[key] = kept;
    }
  }
  for (const asset of assets) {
    const scriptPath = hookScriptPath(hooksDir, asset.name);
    const { event, entry } = buildHookEntry(asset, scriptPath);
    hooks[event] = [...(hooks[event] ?? []), entry];
    await writeScriptFile(scriptPath, buildHookScript(asset));
  }
  config.hooks = hooks;
  await writeConfig(settingsPath, config);
}
