import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail } from "@chain-hub/contracts";

import { parseFrontmatter } from "./frontmatter.js";
import { windsurfAdapter } from "./windsurf.js";

async function makeTmpHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-windsurf-test-"));
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

describe("windsurfAdapter.writeAsset", () => {
  it("dual-writes a rule to both .devin/rules and .windsurf/rules with trigger: always_on", async () => {
    const homeDir = await makeTmpHome();
    await fs.mkdir(path.join(homeDir, ".devin"));
    await fs.mkdir(path.join(homeDir, ".windsurf"));
    await windsurfAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    for (const root of [".devin", ".windsurf"]) {
      const filePath = path.join(homeDir, root, "rules", "style.md");
      const { data } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
      expect(data.trigger).toBe("always_on");
      expect(data.description).toBe("Style");
      expect(data.chain_hub_source).toBe("rules/style");
    }
  });

  it("writes only to the Windsurf root that exists", async () => {
    const homeDir = await makeTmpHome();
    await fs.mkdir(path.join(homeDir, ".windsurf"));

    await windsurfAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    await expect(fs.access(path.join(homeDir, ".windsurf", "rules", "style.md"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(homeDir, ".devin"))).rejects.toThrow();
  });

  it("falls back to .devin when neither root exists", async () => {
    const homeDir = await makeTmpHome();

    await windsurfAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    await expect(fs.access(path.join(homeDir, ".devin", "rules", "style.md"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(homeDir, ".windsurf"))).rejects.toThrow();
  });

  it("dual-writes a workflow without a trigger field", async () => {
    const homeDir = await makeTmpHome();
    await fs.mkdir(path.join(homeDir, ".devin"));
    await fs.mkdir(path.join(homeDir, ".windsurf"));
    const asset = makeAsset({ id: "workflows:deploy", kind: "workflows", name: "deploy", content: "# Deploy\n\n1. Build\n2. Ship" });

    await windsurfAdapter.writeAsset("/chain-home", homeDir, asset);

    for (const root of [".devin", ".windsurf"]) {
      const filePath = path.join(homeDir, root, "workflows", "deploy.md");
      const { data } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
      expect(data.trigger).toBeUndefined();
      expect(data.description).toBe("Deploy");
    }
  });

  it("writes a skill to ~/.codeium/windsurf/skills with name+description frontmatter", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({
      id: "skills:demo",
      kind: "skills",
      name: "demo",
      relativePath: "skills/demo/SKILL.md",
      content: "# Demo Skill\n\nDoes a demo thing."
    });

    await windsurfAdapter.writeAsset("/chain-home", homeDir, asset);

    const filePath = path.join(homeDir, ".codeium", "windsurf", "skills", "demo", "SKILL.md");
    const { data } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
    expect(data.name).toBe("demo");
    expect(data.description).toBe("Demo Skill");
    expect(data.chain_hub_source).toBe("skills/demo");
  });

  it("skips agents (no native target)", async () => {
    const homeDir = await makeTmpHome();
    await windsurfAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "agents", name: "reviewer" }));

    await expect(fs.stat(path.join(homeDir, ".devin", "agents"))).rejects.toThrow();
    await expect(fs.stat(path.join(homeDir, ".codeium", "windsurf", "agents"))).rejects.toThrow();
  });
});

describe("windsurfAdapter.removeAsset", () => {
  it("removes the managed file from both roots", async () => {
    const homeDir = await makeTmpHome();
    await windsurfAdapter.writeAsset("/chain-home", homeDir, makeAsset());
    await windsurfAdapter.removeAsset("/chain-home", homeDir, "rules", "style");

    for (const root of [".devin", ".windsurf"]) {
      await expect(fs.stat(path.join(homeDir, root, "rules", "style.md"))).rejects.toThrow();
    }
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
    await windsurfAdapter.writeAsset("/chain-home", homeDir, asset);
    await windsurfAdapter.removeAsset("/chain-home", homeDir, "skills", "demo");

    await expect(fs.stat(path.join(homeDir, ".codeium", "windsurf", "skills", "demo"))).rejects.toThrow();
  });
});

describe("windsurfAdapter.discover", () => {
  it("finds a plain, unmanaged rule under .devin/rules", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(homeDir, ".devin", "rules", "hand-written.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "Rule body.", "utf8");

    const discovered = await windsurfAdapter.discover(homeDir);

    expect(discovered).toHaveLength(1);
    expect(discovered[0]).toMatchObject({ kind: "rules", name: "hand-written", content: "Rule body." });
  });

  it("finds an unmanaged skill under ~/.codeium/windsurf/skills", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(homeDir, ".codeium", "windsurf", "skills", "hand-written", "SKILL.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "---\nname: hand-written\ndescription: Local skill\n---\n\nBody.", "utf8");

    const discovered = await windsurfAdapter.discover(homeDir);

    expect(discovered).toHaveLength(1);
    expect(discovered[0]).toMatchObject({ kind: "skills", name: "hand-written" });
  });

  it("dedupes a name that exists in both .devin and .windsurf, preferring .devin", async () => {
    const homeDir = await makeTmpHome();
    await fs.mkdir(path.join(homeDir, ".devin", "workflows"), { recursive: true });
    await fs.writeFile(path.join(homeDir, ".devin", "workflows", "deploy.md"), "Devin version.", "utf8");
    await fs.mkdir(path.join(homeDir, ".windsurf", "workflows"), { recursive: true });
    await fs.writeFile(path.join(homeDir, ".windsurf", "workflows", "deploy.md"), "Windsurf version.", "utf8");

    const discovered = await windsurfAdapter.discover(homeDir);

    expect(discovered).toHaveLength(1);
    expect(discovered[0].content).toBe("Devin version.");
  });

  it("excludes chain-hub-managed rules/workflows", async () => {
    const homeDir = await makeTmpHome();
    await windsurfAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    const discovered = await windsurfAdapter.discover(homeDir);

    expect(discovered).toHaveLength(0);
  });
});

describe("windsurfAdapter.status", () => {
  it("reports skills+rules+workflows as supported, agents as unsupported", async () => {
    const homeDir = await makeTmpHome();
    const result = await windsurfAdapter.status(homeDir);
    expect(result.supportedKinds).toEqual(["skills", "rules", "workflows"]);
    expect(result.unsupportedKinds).toEqual(["agents", "prompts"]);
    expect(result.label).toBe("Windsurf (Devin Desktop)");
    expect(result.targetPaths).toContain(path.join(homeDir, ".codeium", "windsurf", "skills"));
  });

  it("reports connected when global skills dir has entries", async () => {
    const homeDir = await makeTmpHome();
    const skillFile = path.join(homeDir, ".codeium", "windsurf", "skills", "demo", "SKILL.md");
    await fs.mkdir(path.dirname(skillFile), { recursive: true });
    await fs.writeFile(skillFile, "---\nname: demo\ndescription: Demo\n---\n\nBody.", "utf8");

    const result = await windsurfAdapter.status(homeDir);
    expect(result.connected).toBe(true);
    expect(result.mode).toBe("managed");
  });
});
