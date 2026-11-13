import { promises as fs } from "node:fs";

import type { AssetDetail, AssetKind } from "@chain-hub/contracts";

import { deriveDescription, parseFrontmatter, stringifyFrontmatter } from "./frontmatter.js";
import { FRONTMATTER_MARKER_KEY, markerSource, projectedFrontmatter } from "./marker.js";
import {
  pathExists,
  removeProjectedSkill,
  writeManagedFile,
  type BackupTarget,
  type WriteManagedOptions
} from "./files.js";

// Prompts and workflows have no editor file format of their own — the open
// Agent Skills equivalent of a manually invoked asset is a skill the user
// triggers by name. Each editor marks invoke-only differently: Claude Code and
// other standard consumers read `disable-model-invocation`, Devin reads
// `triggers: [user]`. The projected file's `chain_hub_source` marker keeps the
// original kind (`prompts/x`, `workflows/x`) so ownership and re-import stay exact.

/** Invoke-only frontmatter for editors that honor the Claude Code field. */
export const DISABLE_MODEL_INVOCATION = { "disable-model-invocation": true } as const;
/** Invoke-only frontmatter for Devin CLI (`/name` trigger). */
export const USER_TRIGGER = { triggers: ["user"] } as const;

export type InvokeStyle = typeof DISABLE_MODEL_INVOCATION | typeof USER_TRIGGER;

/** SKILL.md content for a prompt/workflow projected as an invoke-only skill. */
export function buildInvokedSkillContent(asset: AssetDetail, invokeStyle: InvokeStyle): string {
  const { data: source, body, description } = deriveDescription(asset.content, asset.name);
  return stringifyFrontmatter(
    projectedFrontmatter(asset, source, { name: true, description, defaults: { ...invokeStyle } }),
    body
  );
}

async function markerSourceAt(filePath: string): Promise<string | null> {
  if (!(await pathExists(filePath))) {
    return null;
  }
  const { data } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
  const source = data[FRONTMATTER_MARKER_KEY];
  return typeof source === "string" ? source : null;
}

/**
 * Writes a prompt/workflow as an invoke-only SKILL.md. A same-named real skill
 * owns the `skills/<name>` slot — a projected prompt/workflow must not clobber it.
 */
export async function writeInvokedSkill(
  filePath: string,
  content: string,
  owner: { kind: AssetKind; name: string },
  options?: WriteManagedOptions & { backup?: BackupTarget }
): Promise<void> {
  if ((await markerSourceAt(filePath)) === markerSource("skills", owner.name)) {
    return;
  }

  await writeManagedFile(filePath, content, "frontmatter", options);
}

/** Removes an invoke-only skill projection — only when it is ours, never a same-named real skill's. */
export async function removeInvokedSkill(filePath: string, kind: AssetKind, name: string): Promise<void> {
  if ((await markerSourceAt(filePath)) !== markerSource(kind, name)) {
    return;
  }

  await removeProjectedSkill(filePath);
}
