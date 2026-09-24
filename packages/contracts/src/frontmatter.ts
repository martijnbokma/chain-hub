import type { AssetCompatIssue, AssetKind } from "./asset.js";
import { InvalidInputError } from "./errors.js";

export type FrontmatterValue = string | boolean | string[];
export type FrontmatterData = Record<string, FrontmatterValue>;

const FENCE = "---";
/** YAML block scalar indicators we support in skill/rule frontmatter. */
const BLOCK_SCALAR_RE = /^[|>][+-]?$/;

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalar(raw: string): FrontmatterValue {
  const trimmed = raw.trim();

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) {
      return [];
    }
    return inner.split(",").map((item) => stripQuotes(item.trim()));
  }

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  return stripQuotes(trimmed);
}

function isBlockScalarIndicator(raw: string): boolean {
  return BLOCK_SCALAR_RE.test(raw.trim());
}

/**
 * Collect a YAML block scalar (`>`, `>-`, `|`, `|-`, …) from lines after the indicator.
 * Content lines must be indented; a non-indented non-empty line ends the block.
 */
function readBlockScalar(
  lines: string[],
  startIndex: number,
  indicator: string
): { value: string; nextIndex: number } {
  const folded = indicator.trim().startsWith(">");
  const stripFinalNewline = indicator.trim().endsWith("-");
  const contentLines: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.length === 0) {
      contentLines.push("");
      index += 1;
      continue;
    }

    if (/^\s/.test(line)) {
      contentLines.push(line.replace(/^\s+/, ""));
      index += 1;
      continue;
    }

    break;
  }

  while (contentLines.length > 0 && contentLines[contentLines.length - 1] === "") {
    contentLines.pop();
  }

  let value: string;
  if (folded) {
    value = contentLines
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  } else {
    value = contentLines.join("\n").trimEnd();
    if (!stripFinalNewline && value.length > 0) {
      value = `${value}\n`;
    }
  }

  return { value, nextIndex: index };
}

/**
 * Minimal parser for the flat subset of YAML frontmatter that editor rule/skill
 * files actually use (string, boolean, single-level string-array fields, and
 * common block scalars for long `description` values).
 * Intentionally not a general YAML parser — no new dependency for this.
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

  const data: FrontmatterData = {};
  const frontmatterLines = lines.slice(1, closingIndex);
  let index = 0;

  while (index < frontmatterLines.length) {
    const line = frontmatterLines[index] ?? "";
    index += 1;

    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1);

    if (!key) {
      continue;
    }

    if (isBlockScalarIndicator(rawValue)) {
      const block = readBlockScalar(frontmatterLines, index, rawValue.trim());
      data[key] = block.value;
      index = block.nextIndex;
      continue;
    }

    data[key] = parseScalar(rawValue);
  }

  const body = lines
    .slice(closingIndex + 1)
    .join("\n")
    .replace(/^\n+/, "");

  return { data, body };
}

function needsQuoting(value: string): boolean {
  return value.includes(":") || value.includes("#") || value.trim() !== value || value === "";
}

function formatScalar(value: string): string {
  return needsQuoting(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

export function stringifyFrontmatter(data: FrontmatterData, body: string): string {
  const keys = Object.keys(data);

  if (keys.length === 0) {
    return body;
  }

  const lines = keys.map((key) => {
    const value = data[key];

    if (typeof value === "boolean") {
      return `${key}: ${value}`;
    }

    if (Array.isArray(value)) {
      return `${key}: [${value.map(formatScalar).join(", ")}]`;
    }

    return `${key}: ${formatScalar(value)}`;
  });

  return `${FENCE}\n${lines.join("\n")}\n${FENCE}\n\n${body}`;
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

/**
 * Best-effort author from flat frontmatter (`author:`) including nested forms
 * like `metadata:` / `  author:` that the flat parser still surfaces as `author`.
 */
export function extractAssetAuthor(content: string): string | null {
  const { data } = parseFrontmatter(content);
  if (typeof data.author !== "string") {
    return null;
  }

  const author = data.author.trim();
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
