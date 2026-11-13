import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail } from "@chain-hub/contracts";

import { HEADER_MARKER } from "./marker.js";
import { codexAdapter, codexDir } from "./codex.js";

async function makeTmpHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-codex-test-"));
}

function makeAsset(overrides: Partial<AssetDetail> = {}): AssetDetail {
  return {
    id: "rules:a",
    name: "a",
    kind: "rules",
    relativePath: "rules/a.md",
    updatedAt: new Date().toISOString(),
    content: "# Rule A\n\nBody A.",
    ...overrides
  };
}

describe("codexAdapter rules (merge kind, via resync)", () => {
  it("concatenates all rule assets into a single ~/.codex/AGENTS.md", async () => {
    const homeDir = await makeTmpHome();
    const rules = [
      makeAsset(),
      makeAsset({ id: "rules:b", name: "b", content: "# Rule B\n\nBody B." })
    ];

    await codexAdapter.resync("/chain-home", homeDir, rules);

    const filePath = path.join(codexDir(homeDir), "AGENTS.md");
    const content = await fs.readFile(filePath, "utf8");
    expect(content.startsWith("<!-- chain-hub:rules:start -->")).toBe(true);
    expect(content).toContain("## Rule A");
    expect(content).toContain("Body A.");
    expect(content).toContain("## Rule B");
    expect(content).toContain("Body B.");
  });

  it("keeps hand-written text in AGENTS.md and only rewrites the Chain Hub section", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(codexDir(homeDir), "AGENTS.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "# My own instructions\n", "utf8");

    await codexAdapter.resync("/chain-home", homeDir, [makeAsset({ content: "Generated" })]);
    await codexAdapter.resync("/chain-home", homeDir, [makeAsset({ content: "Regenerated" })]);

    const content = await fs.readFile(filePath, "utf8");
    expect(content.startsWith("# My own instructions")).toBe(true);
    expect(content).toContain("Regenerated");
    expect(content).not.toContain("Generated\n");
    expect(content.match(/chain-hub:rules:start/g)).toHaveLength(1);

    // Removing every hub rule drops the section and leaves the user's text as it was.
    await codexAdapter.resync("/chain-home", homeDir, []);
    expect(await fs.readFile(filePath, "utf8")).toBe("# My own instructions\n");
  });

  it("replaces a fully generated file from older versions", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(codexDir(homeDir), "AGENTS.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${HEADER_MARKER}\n\n# Chain Hub Rules\n\nOld rule\n`, "utf8");

    await codexAdapter.resync("/chain-home", homeDir, [makeAsset({ content: "New rule" })]);

    const content = await fs.readFile(filePath, "utf8");
    expect(content).not.toContain("Old rule");
    expect(content).not.toContain(HEADER_MARKER);
    expect(content).toContain("New rule");
  });
});

describe("codexAdapter.status", () => {
  it("reports rules as supported, everything else as unsupported", async () => {
    const homeDir = await makeTmpHome();
    const result = await codexAdapter.status(homeDir);
    expect(result.supportedKinds).toEqual(["rules"]);
    expect(result.unsupportedKinds).toEqual(["skills", "agents", "workflows", "prompts", "mcp", "hooks"]);
  });
});
