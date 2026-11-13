import { promises as fs } from "node:fs";
import path from "node:path";

import type { AssetDetail } from "@chain-hub/contracts";

import { deriveDescription } from "./frontmatter.js";
import { hasHeaderMarker } from "./marker.js";
import { pathExists } from "./files.js";

// Marked-section merge for AGENTS.md-style files (the AAIF standard, read by
// Codex, Zed, Cursor, Copilot, Gemini CLI and others). Hub rules render into a
// single `chain-hub:rules` block; anything the user wrote outside it is kept
// byte-for-byte. Shared by every adapter that targets an AGENTS.md file.
export const RULES_SECTION_START = "<!-- chain-hub:rules:start -->";
export const RULES_SECTION_END = "<!-- chain-hub:rules:end -->";

function buildRulesSection(ruleAssets: AssetDetail[]): string {
  const sections = ruleAssets.map((asset) => {
    const { body, description } = deriveDescription(asset.content, asset.name);
    return `## ${description}\n\n${body.trim()}`;
  });
  const body = sections.length > 0 ? sections.join("\n\n---\n\n") : "No rules yet.";

  return `${RULES_SECTION_START}\n# Chain Hub Rules\n\n${body}\n${RULES_SECTION_END}`;
}

/** Hand-written text around Chain Hub's section, or "" when the whole file is ours. */
function userContent(existing: string): string {
  if (hasHeaderMarker(existing)) {
    // Files from before sections existed were entirely generated.
    return "";
  }

  const start = existing.indexOf(RULES_SECTION_START);
  const end = existing.indexOf(RULES_SECTION_END);
  if (start === -1 || end === -1 || end < start) {
    return existing.trim();
  }

  const before = existing.slice(0, start).trim();
  const after = existing.slice(end + RULES_SECTION_END.length).trim();
  return [before, after].filter(Boolean).join("\n\n");
}

export async function rebuildAgentsMdFile(filePath: string, ruleAssets: AssetDetail[]): Promise<void> {
  const existing = (await pathExists(filePath)) ? await fs.readFile(filePath, "utf8") : "";
  const kept = userContent(existing);

  // Don't add an empty Chain Hub section to someone's own instructions.
  const section = ruleAssets.length === 0 && kept ? "" : buildRulesSection(ruleAssets);
  const next = [kept, section].filter(Boolean).join("\n\n");

  if (!next) {
    return;
  }

  const content = `${next}\n`;
  if (content !== existing) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
  }
}
