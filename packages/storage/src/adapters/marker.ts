import type { AssetKind } from "@chain-hub/contracts";
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
