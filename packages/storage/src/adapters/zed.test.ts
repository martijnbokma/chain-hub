import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail } from "@chain-hub/contracts";

import { HEADER_MARKER } from "./marker.js";
import { zedAdapter, zedConfigDir } from "./zed.js";

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

describe("zedAdapter skills", () => {
  it("leaves ~/.agents/skills alone — the agent-skills adapter owns that dir", async () => {
    const homeDir = await makeTmpHome();
    await zedAdapter.writeAsset("/chain-home", homeDir, makeAsset());
    await zedAdapter.resync("/chain-home", homeDir, [makeAsset()]);

    await expect(fs.stat(path.join(homeDir, ".agents", "skills"))).rejects.toThrow();
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

    const filePath = path.join(zedConfigDir(homeDir), "AGENTS.md");
    const content = await fs.readFile(filePath, "utf8");
    expect(content.startsWith("<!-- chain-hub:rules:start -->")).toBe(true);
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

    const filePath = path.join(zedConfigDir(homeDir), "AGENTS.md");
    const content = await fs.readFile(filePath, "utf8");
    expect(content).not.toContain("Rule A");
    expect(content).toContain("No rules yet.");
  });

  it("keeps hand-written text in AGENTS.md and only rewrites the Chain Hub section", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(zedConfigDir(homeDir), "AGENTS.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "# My own instructions\n", "utf8");

    await zedAdapter.resync("/chain-home", homeDir, [makeAsset({ kind: "rules", name: "a", content: "Generated" })]);
    await zedAdapter.resync("/chain-home", homeDir, [makeAsset({ kind: "rules", name: "a", content: "Regenerated" })]);

    const content = await fs.readFile(filePath, "utf8");
    expect(content.startsWith("# My own instructions")).toBe(true);
    expect(content).toContain("Regenerated");
    expect(content).not.toContain("Generated\n");
    expect(content.match(/chain-hub:rules:start/g)).toHaveLength(1);

    // Removing every hub rule drops the section and leaves the user's text as it was.
    await zedAdapter.resync("/chain-home", homeDir, []);
    expect(await fs.readFile(filePath, "utf8")).toBe("# My own instructions\n");
  });

  it("replaces a fully generated file from older versions", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(zedConfigDir(homeDir), "AGENTS.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${HEADER_MARKER}\n\n# Chain Hub Rules\n\nOld rule\n`, "utf8");

    await zedAdapter.resync("/chain-home", homeDir, [makeAsset({ kind: "rules", name: "a", content: "New rule" })]);

    const content = await fs.readFile(filePath, "utf8");
    expect(content).not.toContain("Old rule");
    expect(content).not.toContain(HEADER_MARKER);
    expect(content).toContain("New rule");
  });
});

describe("zedAdapter.discover", () => {
  it("returns nothing — skills live under agent-skills, rules can't be split back", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(zedConfigDir(homeDir), "AGENTS.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "# My own instructions\n\nDo X, then Y.", "utf8");

    expect(await zedAdapter.discover(homeDir)).toEqual([]);
  });
});

describe("zedAdapter.status", () => {
  it("reports rules as supported, everything else as unsupported", async () => {
    const homeDir = await makeTmpHome();
    const result = await zedAdapter.status(homeDir);
    expect(result.supportedKinds).toEqual(["rules"]);
    expect(result.unsupportedKinds).toEqual(["skills", "agents", "workflows", "prompts", "mcp", "hooks"]);
  });
});

describe("zedConfigDir", () => {
  it("uses the platform's Zed config folder", () => {
    expect(zedConfigDir("/home/me", "darwin")).toBe(path.join("/home/me", ".config", "zed"));
    expect(zedConfigDir("C:/Users/me", "win32")).toBe(path.join("C:/Users/me", "AppData", "Roaming", "Zed"));
    expect(zedConfigDir("/home/me", "linux")).toBe(path.join("/home/me", ".config", "zed"));
  });
});
