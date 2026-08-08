import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail } from "@chain-hub/contracts";

import { claudeCodeAdapter } from "./claude-code.js";
import { parseFrontmatter } from "./frontmatter.js";

async function makeTmpHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-claude-code-test-"));
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

describe("claudeCodeAdapter.writeAsset", () => {
  it("writes a skill to .claude/skills/<name>/SKILL.md with name+description frontmatter", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset();

    await claudeCodeAdapter.writeAsset("/chain-home", homeDir, asset);

    const filePath = path.join(homeDir, ".claude", "skills", "demo", "SKILL.md");
    const content = await fs.readFile(filePath, "utf8");
    const { data, body } = parseFrontmatter(content);

    expect(data.name).toBe("demo");
    expect(data.description).toBe("Demo Skill");
    expect(data.chain_hub_source).toBe("skills/demo");
    expect(body).toBe("# Demo Skill\n\nDoes a demo thing.");
  });

  it("writes an agent to .claude/agents/<name>.md", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({ id: "agents:reviewer", kind: "agents", name: "reviewer", content: "# Reviewer\n\nReviews code." });

    await claudeCodeAdapter.writeAsset("/chain-home", homeDir, asset);

    const filePath = path.join(homeDir, ".claude", "agents", "reviewer.md");
    const content = await fs.readFile(filePath, "utf8");
    expect(content).toContain("name: reviewer");
  });

  it("writes a rule without name/description fields", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({ id: "rules:style", kind: "rules", name: "style", content: "Always use tabs." });

    await claudeCodeAdapter.writeAsset("/chain-home", homeDir, asset);

    const filePath = path.join(homeDir, ".claude", "rules", "style.md");
    const { data, body } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
    expect(data.name).toBeUndefined();
    expect(data.description).toBeUndefined();
    expect(data.chain_hub_source).toBe("rules/style");
    expect(body).toBe("Always use tabs.");
  });

  it("does not touch a pre-existing file that lacks the chain-hub marker", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(homeDir, ".claude", "rules", "style.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "My own hand-written rule.", "utf8");

    await claudeCodeAdapter.writeAsset("/chain-home", homeDir, makeAsset({ id: "rules:style", kind: "rules", name: "style", content: "Generated content" }));

    const content = await fs.readFile(filePath, "utf8");
    expect(content).toBe("My own hand-written rule.");
  });

  it("skips unsupported kinds", async () => {
    const homeDir = await makeTmpHome();
    await claudeCodeAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "workflows", name: "demo" }));
    const filePath = path.join(homeDir, ".claude", "workflows", "demo.md");
    await expect(fs.stat(filePath)).rejects.toThrow();
  });
});

describe("claudeCodeAdapter.removeAsset", () => {
  it("removes a managed skill file and its now-empty directory", async () => {
    const homeDir = await makeTmpHome();
    await claudeCodeAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    await claudeCodeAdapter.removeAsset("/chain-home", homeDir, "skills", "demo");

    const skillDir = path.join(homeDir, ".claude", "skills", "demo");
    await expect(fs.stat(skillDir)).rejects.toThrow();
  });

  it("does not remove a file lacking the chain-hub marker", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(homeDir, ".claude", "rules", "style.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "My own rule.", "utf8");

    await claudeCodeAdapter.removeAsset("/chain-home", homeDir, "rules", "style");

    const content = await fs.readFile(filePath, "utf8");
    expect(content).toBe("My own rule.");
  });
});

describe("claudeCodeAdapter.status", () => {
  it("reports missing when no target directories exist", async () => {
    const homeDir = await makeTmpHome();
    const result = await claudeCodeAdapter.status(homeDir);
    expect(result.connected).toBe(false);
    expect(result.mode).toBe("missing");
    expect(result.supportedKinds).toEqual(["skills", "agents", "rules"]);
    expect(result.unsupportedKinds).toEqual(["workflows", "prompts"]);
  });

  it("reports managed once a synced file exists", async () => {
    const homeDir = await makeTmpHome();
    await claudeCodeAdapter.writeAsset("/chain-home", homeDir, makeAsset());
    const result = await claudeCodeAdapter.status(homeDir);
    expect(result.connected).toBe(true);
    expect(result.mode).toBe("managed");
  });
});

describe("claudeCodeAdapter.discover", () => {
  it("finds a plain, unmanaged native skill file", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(homeDir, ".claude", "skills", "hand-written", "SKILL.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "---\nname: hand-written\ndescription: A hand-written skill\n---\n\nBody text.", "utf8");

    const discovered = await claudeCodeAdapter.discover(homeDir);

    expect(discovered).toHaveLength(1);
    expect(discovered[0]).toMatchObject({
      kind: "skills",
      name: "hand-written",
      content: "# A hand-written skill\n\nBody text."
    });
  });

  it("excludes files that already carry the chain-hub marker", async () => {
    const homeDir = await makeTmpHome();
    await claudeCodeAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "rules", name: "managed-rule", content: "Managed content." }));

    const discovered = await claudeCodeAdapter.discover(homeDir);

    expect(discovered).toHaveLength(0);
  });

  it("discovers unmanaged agents and rules alongside skills", async () => {
    const homeDir = await makeTmpHome();
    await fs.mkdir(path.join(homeDir, ".claude", "agents"), { recursive: true });
    await fs.writeFile(path.join(homeDir, ".claude", "agents", "reviewer.md"), "Reviews code.", "utf8");
    await fs.mkdir(path.join(homeDir, ".claude", "rules"), { recursive: true });
    await fs.writeFile(path.join(homeDir, ".claude", "rules", "style.md"), "Use tabs.", "utf8");

    const discovered = await claudeCodeAdapter.discover(homeDir);

    expect(discovered.map((c) => c.kind).sort()).toEqual(["agents", "rules"]);
  });
});

describe("claudeCodeAdapter.resync", () => {
  it("writes every supported asset and skips unsupported kinds", async () => {
    const homeDir = await makeTmpHome();
    const assets = [
      makeAsset({ id: "skills:a", kind: "skills", name: "a" }),
      makeAsset({ id: "rules:b", kind: "rules", name: "b", content: "Rule body" }),
      makeAsset({ id: "workflows:c", kind: "workflows", name: "c", content: "Workflow body" })
    ];

    await claudeCodeAdapter.resync("/chain-home", homeDir, assets);

    await expect(fs.stat(path.join(homeDir, ".claude", "skills", "a", "SKILL.md"))).resolves.toBeDefined();
    await expect(fs.stat(path.join(homeDir, ".claude", "rules", "b.md"))).resolves.toBeDefined();
    await expect(fs.stat(path.join(homeDir, ".claude", "workflows", "c.md"))).rejects.toThrow();
  });
});
