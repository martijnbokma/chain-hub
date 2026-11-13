import { z } from "zod";
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
 * Recovers a `---` block whose YAML fails only because of unquoted scalar
 * values (e.g. `description: … fix: building …` — a `: ` inside a plain
 * scalar). Each top-level `key: value` line is parsed on its own; values that
 * don't parse are kept as raw strings, so the writer re-quotes them. Nested
 * structure (indented lines, block scalars) means we cannot tell value from
 * markup — bail instead of guessing.
 */
function salvageFrontmatterBlock(content: string): { data: FrontmatterData; body: string } | null {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== FENCE) {
    return null;
  }
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === FENCE);
  if (closingIndex === -1) {
    return null;
  }

  const data: FrontmatterData = {};
  for (const line of lines.slice(1, closingIndex)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    if (/^\s/.test(line)) {
      return null; // indented content: nested map, list or block scalar
    }
    const match = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) {
      return null;
    }
    const [, key, rawValue] = match;
    if (rawValue === "") {
      data[key] = null;
      continue;
    }
    try {
      const value = parseYaml(rawValue);
      // `Works: sometimes` parses as a nested map, but the author meant a plain
      // scalar — only `{...}` flow maps are real objects here.
      data[key] = isPlainObject(value) && !rawValue.startsWith("{") ? rawValue : (value ?? rawValue);
    } catch {
      data[key] = rawValue;
    }
  }

  if (Object.keys(data).length === 0) {
    return null;
  }
  const body = lines
    .slice(closingIndex + 1)
    .join("\n")
    .replace(/^\n+/, "");
  return { data, body };
}

function explicitDescription(data: FrontmatterData): string | null {
  return typeof data.description === "string" && data.description.trim().length > 0 ? data.description.trim() : null;
}

/**
 * Ensure skill markdown has an explicit non-empty frontmatter `description`.
 * Uses the first heading when present, otherwise `fallbackName`. A frontmatter
 * block that fails to parse is repaired in place (unquoted values get quoted)
 * rather than buried under a second block.
 */
export function ensureExplicitDescription(content: string, fallbackName: string): string {
  const { data, body, description } = deriveDescription(content, fallbackName);

  if (explicitDescription(data)) {
    return content;
  }

  const salvaged = salvageFrontmatterBlock(content);
  if (salvaged) {
    const repairedDescription = explicitDescription(salvaged.data) ?? extractHeading(salvaged.body, fallbackName);
    return stringifyFrontmatter({ ...salvaged.data, description: repairedDescription }, salvaged.body);
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

/**
 * Execution-profile frontmatter shape for agent assets — the fields editors
 * actually consume: tool scope (`tools`/`disallowedTools`), model selection,
 * and isolation hints. Claude Code subagents and Devin agent profiles share
 * this shape; `name`/`description` are required routing fields handled
 * separately. Other frontmatter fields pass through.
 */
export const agentExecutionProfileSchema = z.object({
  tools: z.union([z.string(), z.array(z.string())]).optional(),
  disallowedTools: z.union([z.string(), z.array(z.string())]).optional(),
  model: z.string().optional(),
  isolation: z.string().optional()
});

export type AgentExecutionProfile = z.infer<typeof agentExecutionProfileSchema>;

/** Parses an agent asset's frontmatter into its execution profile. */
export function parseAgentExecutionProfile(content: string): AgentExecutionProfile {
  const { data } = parseFrontmatter(content);
  const parsed = agentExecutionProfileSchema.safeParse(data);
  return parsed.success ? parsed.data : {};
}

/** Deterministic editor-compat findings for an asset's markdown content. */
export function listAssetCompatIssues(kind: AssetKind, content: string): AssetCompatIssue[] {
  if (kind !== "skills" && kind !== "agents") {
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
        kind === "skills"
          ? "Skill description is missing. Editors like Zed reject skills without a non-empty description."
          : "Agent description is missing. Editors route delegation by description, so an agent without one is never reached."
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
