import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail } from "@chain-hub/contracts";

import { parseFrontmatter } from "./frontmatter.js";
import { HEADER_MARKER } from "./marker.js";
import { zedAdapter } from "./zed.js";

async function makeTmpHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-zed-test-"));
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

describe("zedAdapter skills (1:1 kind)", () => {
  it("writes a flat SKILL.md with required name+description frontmatter", async () => {
    const homeDir = await makeTmpHome();
    await zedAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    const filePath = path.join(homeDir, ".agents", "skills", "demo", "SKILL.md");
    const { data } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
    expect(data.name).toBe("demo");
    expect(data.description).toBe("Demo Skill");
  });

  it("removes a managed skill file and its empty directory", async () => {
    const homeDir = await makeTmpHome();
    await zedAdapter.writeAsset("/chain-home", homeDir, makeAsset());
    await zedAdapter.removeAsset("/chain-home", homeDir, "skills", "demo");

    await expect(fs.stat(path.join(homeDir, ".agents", "skills", "demo"))).rejects.toThrow();
  });

  it("skips agents and workflows", async () => {
    const homeDir = await makeTmpHome();
    await zedAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "agents", name: "reviewer" }));
    await zedAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "workflows", name: "deploy" }));

    await expect(fs.stat(path.join(homeDir, ".agents", "agents"))).rejects.toThrow();
  });
});

describe("zedAdapter rules (merge kind, via resync)", () => {
  it("concatenates all rule assets into a single ~/.config/zed/AGENTS.md", async () => {
    const homeDir = await makeTmpHome();
    const rules = [
      makeAsset({ id: "rules:a", kind: "rules", name: "a", content: "# Rule A\n\nBody A." }),
      makeAsset({ id: "rules:b", kind: "rules", name: "b", content: "# Rule B\n\nBody B." })
    ];

    await zedAdapter.resync("/chain-home", homeDir, rules);

    const filePath = path.join(homeDir, ".config", "zed", "AGENTS.md");
    const content = await fs.readFile(filePath, "utf8");
    expect(content.startsWith(HEADER_MARKER)).toBe(true);
    expect(content).toContain("## Rule A");
    expect(content).toContain("Body A.");
    expect(content).toContain("## Rule B");
    expect(content).toContain("Body B.");
  });

  it("rebuilds the merged file so a removed rule disappears on the next resync", async () => {
    const homeDir = await makeTmpHome();
    const rules = [makeAsset({ id: "rules:a", kind: "rules", name: "a", content: "# Rule A\n\nBody A." })];
    await zedAdapter.resync("/chain-home", homeDir, rules);

    await zedAdapter.resync("/chain-home", homeDir, []);

    const filePath = path.join(homeDir, ".config", "zed", "AGENTS.md");
    const content = await fs.readFile(filePath, "utf8");
    expect(content).not.toContain("Rule A");
    expect(content).toContain("No rules yet.");
  });

  it("does not clobber a pre-existing AGENTS.md without the chain-hub header marker", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(homeDir, ".config", "zed", "AGENTS.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "# My own instructions\n", "utf8");

    await zedAdapter.resync("/chain-home", homeDir, [makeAsset({ kind: "rules", name: "a", content: "Generated" })]);

    expect(await fs.readFile(filePath, "utf8")).toBe("# My own instructions\n");
  });
});

describe("zedAdapter.status", () => {
  it("reports skills+rules as supported, agents+workflows as unsupported", async () => {
    const homeDir = await makeTmpHome();
    const result = await zedAdapter.status(homeDir);
    expect(result.supportedKinds).toEqual(["skills", "rules"]);
    expect(result.unsupportedKinds).toEqual(["agents", "workflows"]);
  });
});
