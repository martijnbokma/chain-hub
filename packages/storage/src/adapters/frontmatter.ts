export type FrontmatterValue = string | boolean | string[];
export type FrontmatterData = Record<string, FrontmatterValue>;

const FENCE = "---";

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

/**
 * Minimal parser for the flat subset of YAML frontmatter that editor rule/skill
 * files actually use (string, boolean, and single-level string-array fields).
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

  for (const line of lines.slice(1, closingIndex)) {
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);

    if (key) {
      data[key] = parseScalar(value);
    }
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

/**
 * Derives a description for an asset: prefers an explicit `description` frontmatter
 * field already present in the source content, falls back to the first heading,
 * falls back to the asset name.
 */
export function deriveDescription(content: string, fallbackName: string): { data: FrontmatterData; body: string; description: string } {
  const { data, body } = parseFrontmatter(content);
  const description = typeof data.description === "string" && data.description.length > 0 ? data.description : extractHeading(body, fallbackName);

  return { data, body, description };
}
