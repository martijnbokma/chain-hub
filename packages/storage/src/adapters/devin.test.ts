import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail } from "@chain-hub/contracts";

import { devinAdapter, devinConfigDir } from "./devin.js";
import { parseFrontmatter } from "./frontmatter.js";

async function makeTmpHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-devin-test-"));
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

function configDir(homeDir: string): string {
  return devinConfigDir(homeDir);
}

describe("devinConfigDir", () => {
  it("uses ~/.config/devin on posix and %APPDATA%\\devin on Windows", () => {
    expect(devinConfigDir("/home/u", "darwin")).toBe(path.join("/home/u", ".config", "devin"));
    expect(devinConfigDir("C:\\Users\\u", "win32")).toBe(path.join("C:\\Users\\u", "AppData", "Roaming", "devin"));
  });
});

describe("devinAdapter.writeAsset", () => {
  it("writes a rule to ~/.devin/rules with trigger: always_on", async () => {
    const homeDir = await makeTmpHome();
    await devinAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    const filePath = path.join(homeDir, ".devin", "rules", "style.md");
    const { data } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
    expect(data.trigger).toBe("always_on");
    expect(data.description).toBe("Style");
    expect(data.chain_hub_source).toBe("rules/style");
  });

  it("writes a glob-scoped rule with trigger: glob", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({ content: "---\nglobs: \"**/*.test.ts\"\n---\n\nUse vitest." });

    await devinAdapter.writeAsset("/chain-home", homeDir, asset);

    const { data } = parseFrontmatter(await fs.readFile(path.join(homeDir, ".devin", "rules", "style.md"), "utf8"));
    expect(data.trigger).toBe("glob");
    expect(data.globs).toBe("**/*.test.ts");
  });

  it("writes a skill to <config>/skills with name+description frontmatter", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({
      id: "skills:demo",
      kind: "skills",
      name: "demo",
      relativePath: "skills/demo/SKILL.md",
      content: "# Demo Skill\n\nDoes a demo thing."
    });

    await devinAdapter.writeAsset("/chain-home", homeDir, asset);

    const { data } = parseFrontmatter(await fs.readFile(path.join(configDir(homeDir), "skills", "demo", "SKILL.md"), "utf8"));
    expect(data.name).toBe("demo");
    expect(data.description).toBe("Demo Skill");
    expect(data.chain_hub_source).toBe("skills/demo");
  });

  it("writes an agent to <config>/agents as a custom subagent profile", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({
      id: "agents:reviewer",
      kind: "agents",
      name: "reviewer",
      relativePath: "agents/reviewer.md",
      content: "---\ndescription: Reviews code\nmodel: sonnet\n---\n\nYou review code."
    });

    await devinAdapter.writeAsset("/chain-home", homeDir, asset);

    const { data } = parseFrontmatter(await fs.readFile(path.join(configDir(homeDir), "agents", "reviewer.md"), "utf8"));
    expect(data.name).toBe("reviewer");
    expect(data.description).toBe("Reviews code");
    expect(data.model).toBe("sonnet");
    expect(data.chain_hub_source).toBe("agents/reviewer");
  });

  it("projects a workflow to both ~/.devin/workflows and a user-triggered skill", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({ id: "workflows:deploy", kind: "workflows", name: "deploy", content: "# Deploy\n\n1. Build\n2. Ship" });

    await devinAdapter.writeAsset("/chain-home", homeDir, asset);

    const workflow = parseFrontmatter(await fs.readFile(path.join(homeDir, ".devin", "workflows", "deploy.md"), "utf8"));
    expect(workflow.data.trigger).toBeUndefined();
    expect(workflow.data.chain_hub_source).toBe("workflows/deploy");

    const skill = parseFrontmatter(await fs.readFile(path.join(configDir(homeDir), "skills", "deploy", "SKILL.md"), "utf8"));
    expect(skill.data.name).toBe("deploy");
    expect(skill.data.triggers).toEqual(["user"]);
    expect(skill.data.chain_hub_source).toBe("workflows/deploy");
  });

  it("lets a same-named skill own the skills/<name> slot over a workflow", async () => {
    const homeDir = await makeTmpHome();
    const skillAsset = makeAsset({
      id: "skills:deploy",
      kind: "skills",
      name: "deploy",
      relativePath: "skills/deploy/SKILL.md",
      content: "# Deploy\n\nReal skill."
    });
    const workflowAsset = makeAsset({ id: "workflows:deploy", kind: "workflows", name: "deploy", content: "# Deploy\n\nWorkflow." });

    await devinAdapter.writeAsset("/chain-home", homeDir, skillAsset);
    await devinAdapter.writeAsset("/chain-home", homeDir, workflowAsset);

    const { data, body } = parseFrontmatter(await fs.readFile(path.join(configDir(homeDir), "skills", "deploy", "SKILL.md"), "utf8"));
    expect(data.chain_hub_source).toBe("skills/deploy");
    expect(body).toContain("Real skill.");
  });

  it("skips prompts (no native target)", async () => {
    const homeDir = await makeTmpHome();
    await devinAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "prompts", name: "idea" }));

    await expect(fs.stat(configDir(homeDir))).rejects.toThrow();
    await expect(fs.stat(path.join(homeDir, ".devin"))).rejects.toThrow();
  });
});

describe("devinAdapter.removeAsset", () => {
  it("removes a managed rule file", async () => {
    const homeDir = await makeTmpHome();
    await devinAdapter.writeAsset("/chain-home", homeDir, makeAsset());
    await devinAdapter.removeAsset("/chain-home", homeDir, "rules", "style");

    await expect(fs.stat(path.join(homeDir, ".devin", "rules", "style.md"))).rejects.toThrow();
  });

  it("removes a managed skill file and its directory", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({
      id: "skills:demo",
      kind: "skills",
      name: "demo",
      relativePath: "skills/demo/SKILL.md",
      content: "# Demo\n\nBody."
    });
    await devinAdapter.writeAsset("/chain-home", homeDir, asset);
    await devinAdapter.removeAsset("/chain-home", homeDir, "skills", "demo");

    await expect(fs.stat(path.join(configDir(homeDir), "skills", "demo"))).rejects.toThrow();
  });

  it("removes a workflow from both its targets", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({ id: "workflows:deploy", kind: "workflows", name: "deploy", content: "# Deploy\n\nSteps." });
    await devinAdapter.writeAsset("/chain-home", homeDir, asset);
    await devinAdapter.removeAsset("/chain-home", homeDir, "workflows", "deploy");

    await expect(fs.stat(path.join(homeDir, ".devin", "workflows", "deploy.md"))).rejects.toThrow();
    await expect(fs.stat(path.join(configDir(homeDir), "skills", "deploy"))).rejects.toThrow();
  });

  it("does not remove a same-named skill when removing a workflow", async () => {
    const homeDir = await makeTmpHome();
    const skillAsset = makeAsset({
      id: "skills:deploy",
      kind: "skills",
      name: "deploy",
      relativePath: "skills/deploy/SKILL.md",
      content: "# Deploy\n\nReal skill."
    });
    const workflowAsset = makeAsset({ id: "workflows:deploy", kind: "workflows", name: "deploy", content: "# Deploy\n\nWorkflow." });

    await devinAdapter.writeAsset("/chain-home", homeDir, skillAsset);
    await devinAdapter.writeAsset("/chain-home", homeDir, workflowAsset);
    await devinAdapter.removeAsset("/chain-home", homeDir, "workflows", "deploy");

    const { data } = parseFrontmatter(await fs.readFile(path.join(configDir(homeDir), "skills", "deploy", "SKILL.md"), "utf8"));
    expect(data.chain_hub_source).toBe("skills/deploy");
  });
});

describe("devinAdapter.discover", () => {
  it("finds unmanaged files across all four kinds", async () => {
    const homeDir = await makeTmpHome();

    const skillFile = path.join(configDir(homeDir), "skills", "hand-skill", "SKILL.md");
    await fs.mkdir(path.dirname(skillFile), { recursive: true });
    await fs.writeFile(skillFile, "---\nname: hand-skill\ndescription: Local\n---\n\nBody.", "utf8");

    const agentFile = path.join(configDir(homeDir), "agents", "hand-agent.md");
    await fs.mkdir(path.dirname(agentFile), { recursive: true });
    await fs.writeFile(agentFile, "---\ndescription: Local agent\n---\n\nPrompt.", "utf8");

    const ruleFile = path.join(homeDir, ".devin", "rules", "hand-rule.md");
    await fs.mkdir(path.dirname(ruleFile), { recursive: true });
    await fs.writeFile(ruleFile, "Rule body.", "utf8");

    const workflowFile = path.join(homeDir, ".devin", "workflows", "hand-flow.md");
    await fs.mkdir(path.dirname(workflowFile), { recursive: true });
    await fs.writeFile(workflowFile, "Workflow body.", "utf8");

    const discovered = await devinAdapter.discover(homeDir);

    expect(discovered.map((candidate) => `${candidate.kind}/${candidate.name}`).sort()).toEqual([
      "agents/hand-agent",
      "rules/hand-rule",
      "skills/hand-skill",
      "workflows/hand-flow"
    ]);
  });

  it("excludes chain-hub-managed files", async () => {
    const homeDir = await makeTmpHome();
    await devinAdapter.writeAsset("/chain-home", homeDir, makeAsset());
    await devinAdapter.writeAsset("/chain-home", homeDir, makeAsset({ id: "workflows:deploy", kind: "workflows", name: "deploy", content: "# Deploy" }));

    const discovered = await devinAdapter.discover(homeDir);

    expect(discovered).toHaveLength(0);
  });
});

describe("devinAdapter.status", () => {
  it("reports all four kinds as supported, prompts as unsupported", async () => {
    const homeDir = await makeTmpHome();
    const result = await devinAdapter.status(homeDir);
    expect(result.supportedKinds).toEqual(["skills", "agents", "rules", "workflows"]);
    expect(result.unsupportedKinds).toEqual(["prompts"]);
    expect(result.label).toBe("Devin CLI");
    expect(result.targetPaths).toContain(path.join(configDir(homeDir), "skills"));
    expect(result.targetPaths).toContain(path.join(homeDir, ".devin", "rules"));
  });

  it("reports connected when a target dir has entries", async () => {
    const homeDir = await makeTmpHome();
    const ruleFile = path.join(homeDir, ".devin", "rules", "style.md");
    await fs.mkdir(path.dirname(ruleFile), { recursive: true });
    await fs.writeFile(ruleFile, "Rule.", "utf8");

    const result = await devinAdapter.status(homeDir);
    expect(result.connected).toBe(true);
    expect(result.mode).toBe("managed");
  });
});
