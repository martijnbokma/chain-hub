import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail } from "@chain-hub/contracts";

import { agentSkillsAdapter } from "./agent-skills.js";
import { parseFrontmatter } from "./frontmatter.js";

async function makeTmpHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-agent-skills-test-"));
}

function makeAsset(overrides: Partial<AssetDetail> = {}): AssetDetail {
  return {
    id: "skills:demo",
    name: "demo",
    kind: "skills",
    relativePath: "skills/demo/SKILL.md",
    updatedAt: new Date().toISOString(),
    content: "# Demo Skill\n\nDoes a demo thing.",
    ...overrides
  };
}

describe("agentSkillsAdapter", () => {
  it("projects a folded hub description into a single-line frontmatter field", async () => {
    const homeDir = await makeTmpHome();
    const content = [
      "---",
      "name: bundle-strategy-audit",
      "description: >-",
      "  Audits code splitting and lazy-loading for editors.",
      "---",
      "",
      "# Bundle Strategy Audit",
      "",
      "Body."
    ].join("\n");

    await agentSkillsAdapter.writeAsset(
      "/chain-home",
      homeDir,
      makeAsset({ name: "bundle-strategy-audit", content })
    );

    const filePath = path.join(homeDir, ".agents", "skills", "bundle-strategy-audit", "SKILL.md");
    const { data } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
    expect(data.description).toBe("Audits code splitting and lazy-loading for editors.");
    expect(data.description).not.toBe(">-");
  });

  it("removes a managed skill file and its empty directory", async () => {
    const homeDir = await makeTmpHome();
    await agentSkillsAdapter.writeAsset("/chain-home", homeDir, makeAsset());
    await agentSkillsAdapter.removeAsset("/chain-home", homeDir, "skills", "demo");

    await expect(fs.stat(path.join(homeDir, ".agents", "skills", "demo"))).rejects.toThrow();
  });

  it("skips non-skill kinds", async () => {
    const homeDir = await makeTmpHome();
    await agentSkillsAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "agents", name: "reviewer" }));
    await agentSkillsAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "workflows", name: "deploy" }));

    await expect(fs.stat(path.join(homeDir, ".agents", "agents"))).rejects.toThrow();
    await expect(fs.stat(path.join(homeDir, ".agents", "skills", "reviewer"))).rejects.toThrow();
  });
});

describe("agentSkillsAdapter.discover", () => {
  it("finds a plain, unmanaged skill", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(homeDir, ".agents", "skills", "hand-written", "SKILL.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "---\nname: hand-written\ndescription: A hand-written skill\n---\n\nBody text.", "utf8");

    const discovered = await agentSkillsAdapter.discover(homeDir);

    expect(discovered).toHaveLength(1);
    expect(discovered[0]).toMatchObject({
      kind: "skills",
      name: "hand-written",
      content: "---\nname: hand-written\ndescription: A hand-written skill\n---\n\nBody text."
    });
  });

  it("excludes chain-hub-managed skills", async () => {
    const homeDir = await makeTmpHome();
    await agentSkillsAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    const discovered = await agentSkillsAdapter.discover(homeDir);

    expect(discovered).toHaveLength(0);
  });
});

describe("agentSkillsAdapter.status", () => {
  it("reports skills as supported, everything else as unsupported", async () => {
    const homeDir = await makeTmpHome();
    const result = await agentSkillsAdapter.status(homeDir);
    expect(result.supportedKinds).toEqual(["skills", "prompts", "workflows"]);
    expect(result.unsupportedKinds).toEqual(["agents", "rules", "mcp", "hooks"]);
  });
});
