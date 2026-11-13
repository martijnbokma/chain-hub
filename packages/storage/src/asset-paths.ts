import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

import {
  assertWritableAssetContent,
  type AssetKind,
  assetKinds,
  ensureExplicitDescription,
  InvalidInputError
} from "@chain-hub/contracts";

import { writeFileAtomic } from "./shared.js";

export function prepareAssetContent(kind: AssetKind, name: string, content: string): string {
  const prepared = kind === "skills" ? ensureExplicitDescription(content, name) : content;
  assertWritableAssetContent(kind, prepared);
  return prepared;
}

export const CORE_DIRS = [...assetKinds, "memory", "system", "logs"] as const;

export type AppMeta = {
  initializedAt: string | null;
};

export const DEFAULT_CHAIN_HOME = path.join(os.homedir(), ".chain-hub");

export function resolveChainHome(input?: string): string {
  if (input && input.trim().length > 0) {
    return path.resolve(input);
  }

  return process.env.CHAIN_HOME ? path.resolve(process.env.CHAIN_HOME) : DEFAULT_CHAIN_HOME;
}

export function metaFilePath(chainHome: string): string {
  return path.join(chainHome, "system", "meta.json");
}

/** Index files written by versions that kept a SQLite copy of the asset list. */
export const LEGACY_INDEX_FILES = ["chainhub.sqlite", "chainhub.sqlite-wal", "chainhub.sqlite-shm"];

export function normalizeAssetName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function assertSafeAssetName(name: string): string {
  if (!name || typeof name !== "string") {
    throw new InvalidInputError("Asset name cannot be empty");
  }
  const trimmed = name.trim();
  if (
    trimmed.length === 0 ||
    trimmed.includes("..") ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes("\0")
  ) {
    throw new InvalidInputError(`Invalid asset name: "${name}". Path traversal characters are not allowed.`);
  }
  return trimmed;
}

export function assertSafeAssetKind(kind: string): AssetKind {
  // Route params and CLI flags arrive as plain strings; an unknown kind like ".." would escape the hub.
  if (!(assetKinds as readonly string[]).includes(kind)) {
    throw new InvalidInputError(`Invalid asset kind: "${kind}". Expected one of: ${assetKinds.join(", ")}.`);
  }
  return kind as AssetKind;
}

export function assetFilePath(chainHome: string, kind: AssetKind, name: string): string {
  assertSafeAssetKind(kind);
  const safeName = assertSafeAssetName(name);
  const resolvedKindDir = path.resolve(chainHome, kind);
  const target =
    kind === "skills"
      ? path.resolve(resolvedKindDir, safeName, "SKILL.md")
      : path.resolve(resolvedKindDir, `${safeName}.md`);

  if (!target.startsWith(resolvedKindDir + path.sep)) {
    throw new InvalidInputError(`Unsafe asset path for ${kind}/${name}`);
  }

  return target;
}

/** API paths use forward slashes on every OS (Windows `path.relative` returns backslashes). */
export function toPosixRelative(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join("/");
}

export function toAssetId(kind: AssetKind, name: string): string {
  return `${kind}:${name}`;
}

export async function readMeta(chainHome: string): Promise<AppMeta> {
  try {
    const contents = await fs.readFile(metaFilePath(chainHome), "utf8");
    return JSON.parse(contents) as AppMeta;
  } catch {
    return { initializedAt: null };
  }
}

export async function writeMeta(chainHome: string, meta: AppMeta): Promise<void> {
  await fs.mkdir(path.dirname(metaFilePath(chainHome)), { recursive: true });
  await writeFileAtomic(metaFilePath(chainHome), JSON.stringify(meta, null, 2));
}
