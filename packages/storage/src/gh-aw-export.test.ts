import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail } from "@chain-hub/contracts";

import { exportWorkflowToGhAw } from "./gh-aw-export.js";

function workflow(name = "triage"): AssetDetail {
  return {
    id: `workflows:${name}`,
    kind: "workflows",
    name,
    relativePath: `workflows/${name}.md`,
    updatedAt: new Date().toISOString(),
    content: `---\non:\n  issues:\n    types: [opened]\npermissions:\n  issues: write\n---\n\nTriage the issue.`
  };
}

describe("exportWorkflowToGhAw", () => {
  it("writes a marked gh-aw markdown file into .github/workflows", async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-ghaw-"));
    const { target } = await exportWorkflowToGhAw(workflow(), repo);
    const written = await fs.readFile(target, "utf8");
    expect(target).toBe(path.join(repo, ".github", "workflows", "triage.md"));
    expect(written).toContain("Triage the issue.");
    expect(written).toContain("<!-- chain-hub:managed -->");
  });

  it("refuses to overwrite a foreign workflow file without force", async () => {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-ghaw-"));
    const target = path.join(repo, ".github", "workflows", "triage.md");
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, "hand-written gh-aw file", "utf8");

    await expect(exportWorkflowToGhAw(workflow(), repo)).rejects.toThrow(/Refusing to overwrite/);
    await exportWorkflowToGhAw(workflow(), repo, { force: true });
    expect(await fs.readFile(target, "utf8")).toContain("chain-hub:managed");
  });
});
