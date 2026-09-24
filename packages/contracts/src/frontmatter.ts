import type { AssetCompatIssue, AssetKind } from "./asset.js";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { InvalidInputError } from "./errors.js";

export type FrontmatterValue = unknown;
export type FrontmatterData = Record<string, FrontmatterValue>;

const FENCE = "---";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Splits `---` fenced YAML frontmatter from the markdown body and parses it with a
 * real YAML parser, so nested maps (`metadata.author`), lists (`allowed-tools`),
 * quoted strings and block scalars survive a round-trip. Content whose fence does
 * not hold a valid YAML mapping is returned untouched as body.
 */
export function parseFrontmatter(raw: string): { data: FrontmatterData; body: string } {
  const lines = raw.split("\n");

  if (lines[0]?.trim() !== FENCE) {
    return { data: {}, body: raw };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === FENCE);

  if (closingIndex === -1) {
    return { data: {}, body: raw };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(lines.slice(1, closingIndex).join("\n"));
  } catch {
    return { data: {}, body: raw };
  }

  if (parsed !== null && parsed !== undefined && !isPlainObject(parsed)) {
    return { data: {}, body: raw };
  }

  const body = lines
    .slice(closingIndex + 1)
    .join("\n")
    .replace(/^\n+/, "");

  return { data: parsed ?? {}, body };
}

export function stringifyFrontmatter(data: FrontmatterData, body: string): string {
  if (Object.keys(data).length === 0) {
    return body;
  }

  // lineWidth 0: never fold long descriptions onto continuation lines.
  const yaml = stringifyYaml(data, { lineWidth: 0 }).trimEnd();
  return `${FENCE}\n${yaml}\n${FENCE}\n\n${body}`;
}

function extractHeading(body: string, fallback: string): string {
  const firstLine = body.split("\n").find((line) => line.trim().length > 0) ?? "";
  const match = /^#{1,6}\s+(.+)$/.exec(firstLine.trim());
  return match ? match[1].trim() : fallback;
}

/** Explicit non-empty `description` from frontmatter, or null when missing/blank. */
export function getExplicitDescription(content: string): string | null {
  const { data } = parseFrontmatter(content);
  if (typeof data.description !== "string") {
    return null;
  }

  const description = data.description.trim();
  return description.length > 0 ? description : null;
}

/**
 * Derives a description for an asset: prefers an explicit `description` frontmatter
 * field already present in the source content, falls back to the first heading,
 * falls back to the asset name.
 */
export function deriveDescription(content: string, fallbackName: string): { data: FrontmatterData; body: string; description: string } {
  const { data, body } = parseFrontmatter(content);
  const explicit =
    typeof data.description === "string" && data.description.trim().length > 0 ? data.description.trim() : null;
  const description = explicit ?? extractHeading(body, fallbackName);

  return { data, body, description };
}

/**
 * Ensure skill markdown has an explicit non-empty frontmatter `description`.
 * Uses the first heading when present, otherwise `fallbackName`.
 */
export function ensureExplicitDescription(content: string, fallbackName: string): string {
  const { data, body, description } = deriveDescription(content, fallbackName);
  const explicit =
    typeof data.description === "string" && data.description.trim().length > 0 ? data.description.trim() : null;

  if (explicit) {
    return content;
  }

  return stringifyFrontmatter({ ...data, description }, body);
}

/** Author from `metadata.author` (Agent Skills spec) or a top-level `author` field. */
export function extractAssetAuthor(content: string): string | null {
  const { data } = parseFrontmatter(content);
  const metadata = isPlainObject(data.metadata) ? data.metadata : {};
  const candidate = typeof metadata.author === "string" ? metadata.author : data.author;
  if (typeof candidate !== "string") {
    return null;
  }

  const author = candidate.trim();
  return author.length > 0 ? author : null;
}

/** Deterministic editor-compat findings for an asset's markdown content. */
export function listAssetCompatIssues(kind: AssetKind, content: string): AssetCompatIssue[] {
  if (kind !== "skills") {
    return [];
  }

  if (getExplicitDescription(content)) {
    return [];
  }

  return [
    {
      code: "missing_description",
      severity: "error",
      message:
        "Skill description is missing. Editors like Zed reject skills without a non-empty description."
    }
  ];
}

/** Throws when skill content is missing a required explicit description (save/sync gate). */
export function assertWritableAssetContent(kind: AssetKind, content: string): void {
  const blocking = listAssetCompatIssues(kind, content).find((issue) => issue.severity === "error");
  if (blocking) {
    throw new InvalidInputError(blocking.message);
  }
}
