import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail } from "@chain-hub/contracts";

import { cursorAdapter } from "./cursor.js";
import { parseFrontmatter } from "./frontmatter.js";

async function makeTmpHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-cursor-test-"));
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

describe("cursorAdapter.writeAsset", () => {
  it("writes a skill to .cursor/skills/<name>/SKILL.md with name+description", async () => {
    const homeDir = await makeTmpHome();
    await cursorAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    const filePath = path.join(homeDir, ".cursor", "skills", "demo", "SKILL.md");
    const { data } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
    expect(data.name).toBe("demo");
    expect(data.description).toBe("Demo Skill");
    expect(data.chain_hub_source).toBe("skills/demo");
  });

  it("writes a rule to .cursor/rules/<name>.mdc with alwaysApply: true", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({ id: "rules:style", kind: "rules", name: "style", content: "# Style\n\nUse tabs." });

    await cursorAdapter.writeAsset("/chain-home", homeDir, asset);

    const filePath = path.join(homeDir, ".cursor", "rules", "style.mdc");
    const { data, body } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
    expect(data.alwaysApply).toBe(true);
    expect(data.description).toBe("Style");
    expect(body).toBe("# Style\n\nUse tabs.");
  });

  it("skips agents and workflows (no native target in Cursor)", async () => {
    const homeDir = await makeTmpHome();
    await cursorAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "agents", name: "reviewer" }));
    await cursorAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "workflows", name: "deploy" }));

    await expect(fs.stat(path.join(homeDir, ".cursor", "agents"))).rejects.toThrow();
    await expect(fs.stat(path.join(homeDir, ".cursor", "workflows"))).rejects.toThrow();
  });

  it("does not clobber a pre-existing unmarked file", async () => {
    const homeDir = await makeTmpHome();
    const filePath = path.join(homeDir, ".cursor", "rules", "style.mdc");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "My own rule.", "utf8");

    await cursorAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "rules", name: "style", content: "Generated" }));

    expect(await fs.readFile(filePath, "utf8")).toBe("My own rule.");
  });
});

describe("cursorAdapter.removeAsset", () => {
  it("removes a managed skill file and its empty directory", async () => {
    const homeDir = await makeTmpHome();
    await cursorAdapter.writeAsset("/chain-home", homeDir, makeAsset());
    await cursorAdapter.removeAsset("/chain-home", homeDir, "skills", "demo");

    await expect(fs.stat(path.join(homeDir, ".cursor", "skills", "demo"))).rejects.toThrow();
  });
});

describe("cursorAdapter.status", () => {
  it("reports supported/unsupported kinds correctly", async () => {
    const homeDir = await makeTmpHome();
    const result = await cursorAdapter.status(homeDir);
    expect(result.supportedKinds).toEqual(["skills", "rules"]);
    expect(result.unsupportedKinds).toEqual(["agents", "workflows"]);
    expect(result.mode).toBe("missing");
  });
});
