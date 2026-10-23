import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail, AssetKind } from "@chain-hub/contracts";

import { antigravityAdapter } from "./antigravity.js";
import { claudeCodeAdapter } from "./claude-code.js";
import { cursorAdapter } from "./cursor.js";
import { devinAdapter, devinConfigDir } from "./devin.js";
import { parseFrontmatter } from "./frontmatter.js";
import type { EditorAdapter } from "./types.js";
import { windsurfAdapter } from "./windsurf.js";
import { zedAdapter } from "./zed.js";

function asset(kind: AssetKind, name: string, content: string): AssetDetail {
  const relativePath = kind === "skills" ? `skills/${name}/SKILL.md` : `${kind}/${name}.md`;
  return { id: `${kind}:${name}`, name, kind, relativePath, updatedAt: new Date().toISOString(), content };
}

const skill = asset(
  "skills",
  "pdf-tool",
  [
    "---",
    "name: pdf-tool",
    "description: Work with PDFs",
    "allowed-tools:",
    "  - Bash",
    "  - Read",
    "disable-model-invocation: true",
    "license: MIT",
    "metadata:",
    "  author: someone",
    "---",
    "",
    "# PDF",
    ""
  ].join("\n")
);

async function projectedData(adapter: EditorAdapter, item: AssetDetail, relativeTarget: string) {
  const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), `chain-hub-projection-${adapter.id}-`));
  await adapter.writeAsset("/chain-home", homeDir, item);
  return parseFrontmatter(await fs.readFile(path.join(homeDir, relativeTarget), "utf8")).data;
}

describe("projection keeps asset frontmatter", () => {
  it.each([
    [claudeCodeAdapter, ".claude/skills/pdf-tool/SKILL.md"],
    [cursorAdapter, ".cursor/skills/pdf-tool/SKILL.md"],
    [windsurfAdapter, ".codeium/windsurf/skills/pdf-tool/SKILL.md"],
    [zedAdapter, ".agents/skills/pdf-tool/SKILL.md"],
    [antigravityAdapter, ".gemini/config/plugins/chain-hub/skills/pdf-tool/SKILL.md"]
  ])("%o keeps skill fields", async (adapter, target) => {
    const data = await projectedData(adapter, skill, target);

    expect(data).toMatchObject({
      chain_hub_source: "skills/pdf-tool",
      name: "pdf-tool",
      description: "Work with PDFs",
      "allowed-tools": ["Bash", "Read"],
      "disable-model-invocation": true,
      license: "MIT",
      metadata: { author: "someone" }
    });
  });

  it("keeps skill fields for Devin CLI (platform-specific config dir)", async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-projection-devin-"));
    await devinAdapter.writeAsset("/chain-home", homeDir, skill);
    const data = parseFrontmatter(await fs.readFile(path.join(devinConfigDir(homeDir), "skills", "pdf-tool", "SKILL.md"), "utf8")).data;

    expect(data).toMatchObject({
      chain_hub_source: "skills/pdf-tool",
      name: "pdf-tool",
      description: "Work with PDFs",
      "allowed-tools": ["Bash", "Read"],
      "disable-model-invocation": true,
      license: "MIT",
      metadata: { author: "someone" }
    });
  });

  it("keeps Claude Code agent tools and model", async () => {
    const agent = asset("agents", "reviewer", "---\nname: reviewer\ndescription: Reviews code\ntools: Read, Grep\nmodel: haiku\n---\n\nYou review code.\n");
    const data = await projectedData(claudeCodeAdapter, agent, ".claude/agents/reviewer.md");
    expect(data).toMatchObject({ tools: "Read, Grep", model: "haiku", description: "Reviews code" });
  });

  it("drops Claude-only agent fields for Antigravity", async () => {
    const agent = asset("agents", "reviewer", "---\nname: reviewer\ndescription: Reviews code\ntools: Read, Grep\nmodel: haiku\ncolor: blue\n---\n\nYou review code.\n");
    const data = await projectedData(antigravityAdapter, agent, ".gemini/config/plugins/chain-hub/agents/reviewer.md");
    expect(data.model).toBeUndefined();
    expect(data.tools).toBeUndefined();
    expect(data.color).toBe("blue");
  });

  it("keeps a rule's globs scope instead of forcing always-on", async () => {
    const scoped = asset("rules", "tests", "---\ndescription: Test style\nglobs: \"**/*.test.ts\"\n---\n\nUse vitest.\n");
    const plain = asset("rules", "plain", "# Plain\n\nAlways.\n");

    expect(await projectedData(cursorAdapter, scoped, ".cursor/rules/tests.mdc")).toMatchObject({ globs: "**/*.test.ts" });
    expect((await projectedData(cursorAdapter, scoped, ".cursor/rules/tests.mdc")).alwaysApply).toBeUndefined();
    expect(await projectedData(cursorAdapter, plain, ".cursor/rules/plain.mdc")).toMatchObject({ alwaysApply: true });

    expect(await projectedData(windsurfAdapter, scoped, ".windsurf/rules/tests.md")).toMatchObject({ trigger: "glob" });
    expect(await projectedData(windsurfAdapter, plain, ".windsurf/rules/plain.md")).toMatchObject({ trigger: "always_on" });

    expect(await projectedData(devinAdapter, scoped, ".devin/rules/tests.md")).toMatchObject({ trigger: "glob" });
    expect(await projectedData(devinAdapter, plain, ".devin/rules/plain.md")).toMatchObject({ trigger: "always_on" });
  });
});
