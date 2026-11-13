import { promises as fs } from "node:fs";
import path from "node:path";

import { ConflictError, type AssetDetail } from "@chain-hub/contracts";

import { markerSource } from "./adapters/marker.js";

// GitHub Agentic Workflows (`gh aw`) live repo-scoped: markdown + frontmatter
// at <repo>/.github/workflows/<name>.md, compiled by `gh aw compile` into
// Actions YAML. The hub is user-level, so this is an explicit export, not a
// sync — the workflow asset's frontmatter carries the gh-aw config (on:,
// permissions:, tools:) and its body becomes the workflow body.
const MANAGED_MARKER = "<!-- chain-hub:managed -->";

export interface ExportGhAwResult {
  target: string;
  name: string;
}

/** Exports a workflow asset to a repo's .github/workflows dir as a gh-aw markdown file. */
export async function exportWorkflowToGhAw(
  asset: AssetDetail,
  repoDir: string,
  options: { force?: boolean } = {}
): Promise<ExportGhAwResult> {
  const workflowsDir = path.join(repoDir, ".github", "workflows");
  const target = path.join(workflowsDir, `${asset.name}.md`);

  try {
    const existing = await fs.readFile(target, "utf8");
    const managed = existing.includes(MANAGED_MARKER) || existing.includes(markerSource(asset.kind, asset.name));
    if (!managed && !options.force) {
      throw new ConflictError(
        `Refusing to overwrite ${target}: it exists and is not managed by Chain Hub (pass force to claim it)`
      );
    }
  } catch (error) {
    if (error instanceof ConflictError) {
      throw error;
    }
    // ENOENT — nothing there, safe to write.
  }

  const content = `${asset.content.trimEnd()}\n\n${MANAGED_MARKER}\n`;
  await fs.mkdir(workflowsDir, { recursive: true });
  await fs.writeFile(target, content, "utf8");
  return { target, name: asset.name };
}
