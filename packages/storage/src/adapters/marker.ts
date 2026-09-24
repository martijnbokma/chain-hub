import type { AssetDetail, AssetKind } from "@chain-hub/contracts";
import type { FrontmatterData } from "./frontmatter.js";

export const FRONTMATTER_MARKER_KEY = "chain_hub_source";
export const HEADER_MARKER = "<!-- chain-hub:managed -->";

/** Source marker for a 1:1 generated file, stored as a frontmatter field. */
export function markerSource(kind: AssetKind, name: string): string {
  return `${kind}/${name}`;
}

/** True if a frontmatter block already carries Chain Hub's ownership marker. */
export function hasFrontmatterMarker(data: FrontmatterData): boolean {
  return typeof data[FRONTMATTER_MARKER_KEY] === "string";
}

/** True if a whole-file (merge kind) generated file carries Chain Hub's header marker. */
export function hasHeaderMarker(content: string): boolean {
  const firstLine = content.split("\n").find((line) => line.trim().length > 0) ?? "";
  return firstLine.trim() === HEADER_MARKER;
}

/**
 * Frontmatter for a 1:1 projected file. Starts with the ownership marker and the
 * fields the editor needs (`name`, `description`), then keeps every other field the
 * asset declares (`allowed-tools`, `metadata`, agent `tools`/`model`, rule `globs`, …)
 * so projection never silently drops behavior. `defaults` fill fields the asset
 * leaves unset; `omit` drops fields an editor cannot use.
 */
export function projectedFrontmatter(
  asset: AssetDetail,
  source: FrontmatterData,
  fields: {
    name?: boolean;
    description?: string;
    defaults?: FrontmatterData;
    omit?: readonly string[];
  }
): FrontmatterData {
  const data: FrontmatterData = { [FRONTMATTER_MARKER_KEY]: markerSource(asset.kind, asset.name) };

  if (fields.name) {
    data.name = asset.name;
  }
  if (fields.description !== undefined) {
    data.description = fields.description;
  }

  for (const [key, value] of Object.entries(source)) {
    if (!(key in data) && !fields.omit?.includes(key)) {
      data[key] = value;
    }
  }

  for (const [key, value] of Object.entries(fields.defaults ?? {})) {
    if (!(key in data)) {
      data[key] = value;
    }
  }

  return data;
}
