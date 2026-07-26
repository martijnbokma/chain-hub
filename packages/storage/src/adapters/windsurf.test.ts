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
    await windsurfAdapter.writeAsset("/chain-home", homeDir, makeAsset());

    for (const root of [".devin", ".windsurf"]) {
      const filePath = path.join(homeDir, root, "rules", "style.md");
      const { data } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
      expect(data.trigger).toBe("always_on");
      expect(data.description).toBe("Style");
      expect(data.chain_hub_source).toBe("rules/style");
    }
  });

  it("dual-writes a workflow without a trigger field", async () => {
    const homeDir = await makeTmpHome();
    const asset = makeAsset({ id: "workflows:deploy", kind: "workflows", name: "deploy", content: "# Deploy\n\n1. Build\n2. Ship" });

    await windsurfAdapter.writeAsset("/chain-home", homeDir, asset);

    for (const root of [".devin", ".windsurf"]) {
      const filePath = path.join(homeDir, root, "workflows", "deploy.md");
      const { data } = parseFrontmatter(await fs.readFile(filePath, "utf8"));
      expect(data.trigger).toBeUndefined();
      expect(data.description).toBe("Deploy");
    }
  });

  it("skips skills and agents (skills format unconfirmed, agents has no native target)", async () => {
    const homeDir = await makeTmpHome();
    await windsurfAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "skills", name: "demo" }));
    await windsurfAdapter.writeAsset("/chain-home", homeDir, makeAsset({ kind: "agents", name: "reviewer" }));

    await expect(fs.stat(path.join(homeDir, ".devin", "skills"))).rejects.toThrow();
    await expect(fs.stat(path.join(homeDir, ".devin", "agents"))).rejects.toThrow();
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
});

describe("windsurfAdapter.status", () => {
  it("reports rules+workflows as supported, skills+agents as unsupported", async () => {
    const homeDir = await makeTmpHome();
    const result = await windsurfAdapter.status(homeDir);
    expect(result.supportedKinds).toEqual(["rules", "workflows"]);
    expect(result.unsupportedKinds).toEqual(["skills", "agents"]);
    expect(result.label).toBe("Windsurf (Devin Desktop)");
  });
});
