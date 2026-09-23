import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail } from "@chain-hub/contracts";

import { antigravityAdapter } from "./antigravity.js";
import { parseFrontmatter } from "./frontmatter.js";

async function makeTmpHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-antigravity-test-"));
}

function pluginDir(homeDir: string): string {
  return path.join(homeDir, ".gemini", "config", "plugins", "chain-hub");
}

function makeAsset(overrides: Partial<AssetDetail> = {}): AssetDetail {
  return {
    id: "rules:style",
    name: "style",
    kind: "rules",
    relativePath: "rules/style.md",
    updatedAt: new Date().toISOString(),
    content: "# Style\n\nUse tabs.",
    ...overrides
  };
}

describe("antigravityAdapter.writeAsset", () => {
  it("writes plugin.json alongside the first asset", async () => {
    const homeDir = await makeTmpHome();
    await antigravityAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    const manifest = JSON.parse(await fs.readFile(path.join(pluginDir(homeDir), "plugin.json"), "utf8"));
    expect(manifest.name).toBe("chain-hub");
    expect(manifest.$schema).toBe("https://antigravity.google/schemas/v1/plugin.json");
  });

  it("writes a rule to the plugin rules folder with trigger: always_on", async () => {
    const homeDir = await makeTmpHome();
    await antigravityAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    const { data } = parseFrontmatter(await fs.readFile(path.join(pluginDir(homeDir), "rules", "style.md"), "utf8"));
    expect(data.trigger).toBe("always_on");
    expect(data.description).toBe("Style");
    expect(data.chain_hub_source).toBe("rules/style");
  });

  it("writes a skill with name+description frontmatter", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({
      id: "skills:demo",
      kind: "skills",
      name: "demo",
      relativePath: "skills/demo/SKILL.md",
      content: "# Demo Skill\n\nDoes a demo thing."
    });

    await antigravityAdapter.writeAsset("/chain-home", homeDir, asset);

    const { data } = parseFrontmatter(await fs.readFile(path.join(pluginDir(homeDir), "skills", "demo", "SKILL.md"), "utf8"));
    expect(data.name).toBe("demo");
    expect(data.description).toBe("Demo Skill");
    expect(data.chain_hub_source).toBe("skills/demo");
  });

  it("writes an agent as a subagent file without a model field", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({ id: "agents:reviewer", kind: "agents", name: "reviewer", content: "# Code reviewer\n\nReview diffs." });

    await antigravityAdapter.writeAsset("/chain-home", homeDir, asset);

    const { data } = parseFrontmatter(await fs.readFile(path.join(pluginDir(homeDir), "agents", "reviewer.md"), "utf8"));
    expect(data.name).toBe("reviewer");
    expect(data.description).toBe("Code reviewer");
    expect(data.model).toBeUndefined();
  });

  it("skips workflows (retired by Antigravity)", async () => {
    const homeDir = await makeTmpHome();
    await antigravityAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "workflows", name: "deploy" }));

    await expect(fs.stat(pluginDir(homeDir))).rejects.toThrow();
  });

  it("leaves a foreign plugin.json untouched and writes nothing", async () => {
    const homeDir = await makeTmpHome();
    const manifestPath = path.join(pluginDir(homeDir), "plugin.json");
    await fs.mkdir(pluginDir(homeDir), { recursive: true });
    await fs.writeFile(manifestPath, '{ "name": "someone-else" }', "utf8");

    await antigravityAdapter.writeAsset("/chain-home", homeDir, makeAsset(), { force: true });

    expect(await fs.readFile(manifestPath, "utf8")).toBe('{ "name": "someone-else" }');
    await expect(fs.stat(path.join(pluginDir(homeDir), "rules"))).rejects.toThrow();
  });

  it("claims a pre-existing chain-hub plugin.json", async () => {
    const homeDir = await makeTmpHome();
    const manifestPath = path.join(pluginDir(homeDir), "plugin.json");
    await fs.mkdir(pluginDir(homeDir), { recursive: true });
    await fs.writeFile(manifestPath, '{ "name": "chain-hub", "version": "1.0.0" }', "utf8");

    await antigravityAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    expect(manifest.$schema).toBeDefined();
    await expect(fs.stat(path.join(pluginDir(homeDir), "rules", "style.md"))).resolves.toBeDefined();
  });
});

describe("antigravityAdapter.removeAsset", () => {
  it("removes a managed rule", async () => {
    const homeDir = await makeTmpHome();
    await antigravityAdapter.writeAsset("/chain-home", homeDir, makeAsset());
    await antigravityAdapter.removeAsset("/chain-home", homeDir, "rules", "style");

    await expect(fs.stat(path.join(pluginDir(homeDir), "rules", "style.md"))).rejects.toThrow();
  });

  it("removes a managed skill file and its directory", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({ id: "skills:demo", kind: "skills", name: "demo", relativePath: "skills/demo/SKILL.md", content: "# Demo\n\nBody." });
    await antigravityAdapter.writeAsset("/chain-home", homeDir, asset);
    await antigravityAdapter.removeAsset("/chain-home", homeDir, "skills", "demo");

    await expect(fs.stat(path.join(pluginDir(homeDir), "skills", "demo"))).rejects.toThrow();
  });
});

describe("antigravityAdapter.discover", () => {
  it("finds unmanaged skills and agents in ~/.gemini/config", async () => {
    const homeDir = await makeTmpHome();
    const skillFile = path.join(homeDir, ".gemini", "config", "skills", "hand-written", "SKILL.md");
    const agentFile = path.join(homeDir, ".gemini", "config", "agents", "helper.md");
    await fs.mkdir(path.dirname(skillFile), { recursive: true });
    await fs.mkdir(path.dirname(agentFile), { recursive: true });
    await fs.writeFile(skillFile, "---\nname: hand-written\ndescription: Local skill\n---\n\nBody.", "utf8");
    await fs.writeFile(agentFile, "---\nname: helper\ndescription: Helps\n---\n\nYou help.", "utf8");

    const discovered = await antigravityAdapter.discover(homeDir);

    expect(discovered.map(({ kind, name }) => `${kind}/${name}`).sort()).toEqual(["agents/helper", "skills/hand-written"]);
  });

  it("ignores assets inside the chain-hub plugin", async () => {
    const homeDir = await makeTmpHome();
    await antigravityAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "skills", name: "demo", content: "# Demo\n\nBody." }));

    expect(await antigravityAdapter.discover(homeDir)).toHaveLength(0);
  });
});

describe("antigravityAdapter.status", () => {
  it("reports skills+agents+rules as supported", async () => {
    const homeDir = await makeTmpHome();
    const result = await antigravityAdapter.status(homeDir);

    expect(result.supportedKinds).toEqual(["skills", "agents", "rules"]);
    expect(result.unsupportedKinds).toEqual(["workflows", "prompts"]);
    expect(result.connected).toBe(false);
    expect(result.targetPaths).toContain(path.join(pluginDir(homeDir), "skills"));
  });

  it("reports connected once an asset is synced", async () => {
    const homeDir = await makeTmpHome();
    await antigravityAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    const result = await antigravityAdapter.status(homeDir);
    expect(result.connected).toBe(true);
    expect(result.mode).toBe("managed");
  });
});
