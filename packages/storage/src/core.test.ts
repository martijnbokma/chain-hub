import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  assetFilePath,
  assertSafeAssetName,
  convertAssetKind,
  createAsset,
  deleteAsset,
  forkHubAsset,
  getAsset,
  initializeHub,
  listAssets,
  renameAsset,
  scanAssets,
  updateAsset
} from "./core.js";

async function makeTmpHub(): Promise<string> {
  const hub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-core-"));
  await initializeHub(hub);
  return hub;
}

/** Marks a hub skill as installed from git, which makes it upstream-owned. */
async function lockAsUpstream(hub: string, name: string): Promise<void> {
  const now = new Date().toISOString();
  const lock = {
    version: 1,
    skills: {
      [name]: { sourceType: "git", source: "https://example.com/repo.git", subdir: null, installedAt: now, updatedAt: now }
    }
  };
  await fs.writeFile(path.join(hub, "system", "skills-lock.json"), JSON.stringify(lock), "utf8");
}

const SKILL = "---\nname: demo\ndescription: Demo skill. Use in tests.\n---\n\n# Demo\n";

describe("asset names and paths", () => {
  it("rejects path traversal in names", () => {
    expect(() => assertSafeAssetName("../escape")).toThrow(/Path traversal/);
    expect(() => assertSafeAssetName("a/b")).toThrow(/Path traversal/);
    expect(() => assertSafeAssetName("   ")).toThrow(/Path traversal/);
  });

  it("maps skills to a folder and other kinds to a flat file", () => {
    expect(assetFilePath("/hub", "skills", "demo")).toBe(path.resolve("/hub", "skills", "demo", "SKILL.md"));
    expect(assetFilePath("/hub", "rules", "demo")).toBe(path.resolve("/hub", "rules", "demo.md"));
  });

  it("rejects unknown kinds", () => {
    expect(() => assetFilePath("/hub", "../system" as "rules", "demo")).toThrow(/Invalid asset kind/);
  });
});

describe("initializeHub", () => {
  it("seeds the welcome skill and learnings rule on first run only", async () => {
    const hub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-core-"));
    const first = await initializeHub(hub);
    expect(first.isFirstRun).toBe(true);
    expect((await scanAssets(hub)).map((asset) => asset.id)).toEqual(["rules:chain-hub-learnings", "skills:welcome"]);

    await fs.rm(path.join(hub, "skills", "welcome"), { recursive: true });
    const second = await initializeHub(hub);
    expect(second.isFirstRun).toBe(false);
    expect((await scanAssets(hub)).map((asset) => asset.id)).toEqual(["rules:chain-hub-learnings"]);
  });
});

describe("scanAssets", () => {
  it("skips hidden entries and install staging folders", async () => {
    const hub = await makeTmpHub();
    await fs.mkdir(path.join(hub, "skills", ".hidden"), { recursive: true });
    await fs.writeFile(path.join(hub, "skills", ".hidden", "SKILL.md"), SKILL, "utf8");
    await fs.mkdir(path.join(hub, "skills", "demo.staging-123"), { recursive: true });
    await fs.writeFile(path.join(hub, "skills", "demo.staging-123", "SKILL.md"), SKILL, "utf8");

    const names = (await scanAssets(hub)).map((asset) => asset.name);
    expect(names).not.toContain(".hidden");
    expect(names).not.toContain("demo.staging-123");
  });
});

describe("renameAsset", () => {
  it("normalizes the new name and moves the file", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "rules", name: "old-rule", content: "# Rule" });

    const renamed = await renameAsset(hub, "rules", "old-rule", "New Rule");

    expect(renamed.name).toBe("new-rule");
    await expect(getAsset(hub, "rules", "old-rule")).rejects.toThrow(/not found/);
  });

  it("refuses to overwrite an existing asset", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "rules", name: "a", content: "# A" });
    await createAsset(hub, { kind: "rules", name: "b", content: "# B" });

    await expect(renameAsset(hub, "rules", "a", "b")).rejects.toThrow(/already exists/);
  });

  it("rejects an empty new name", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "rules", name: "a", content: "# A" });

    await expect(renameAsset(hub, "rules", "a", "!!!")).rejects.toThrow(/New asset name cannot be empty/);
  });

  it("blocks renaming an upstream-owned skill", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "skills", name: "demo", content: SKILL });
    await lockAsUpstream(hub, "demo");

    await expect(renameAsset(hub, "skills", "demo", "demo-2")).rejects.toThrow(
      "Skill skills/demo is upstream-owned. Fork it to customize, or edits will be lost on update."
    );
  });
});

describe("updateAsset", () => {
  it("blocks edits to an upstream-owned skill", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "skills", name: "demo", content: SKILL });
    await lockAsUpstream(hub, "demo");

    await expect(updateAsset(hub, "skills", "demo", SKILL)).rejects.toThrow(/upstream-owned/);
  });
});

describe("convertAssetKind", () => {
  it("moves content to the new kind", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "prompts", name: "review", content: "# Review\n\nCheck the diff." });

    const converted = await convertAssetKind(hub, "prompts", "review", "rules");

    expect(converted.kind).toBe("rules");
    expect(converted.content).toContain("Check the diff.");
    await expect(getAsset(hub, "prompts", "review")).rejects.toThrow(/not found/);
  });

  it("blocks converting an upstream-owned skill with fork-first advice", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "skills", name: "demo", content: SKILL });
    await lockAsUpstream(hub, "demo");

    await expect(convertAssetKind(hub, "skills", "demo", "rules")).rejects.toThrow(
      "Skill skills/demo is upstream-owned. Fork it to customize, then convert the fork."
    );
  });
});

describe("upstream-owned agents and workflows", () => {
  const AGENT = "---\nname: qa-agent\ndescription: QA agent.\n---\n\n# QA\n";

  async function lockAssetAsUpstream(hub: string, kind: string, name: string): Promise<void> {
    const now = new Date().toISOString();
    const lock = {
      version: 1,
      entries: {
        [`${kind}/${name}`]: {
          sourceType: "git",
          source: "https://example.com/repo.git",
          subdir: null,
          installedAt: now,
          updatedAt: now,
          catalogId: "default"
        }
      }
    };
    await fs.writeFile(path.join(hub, "system", "assets-lock.json"), JSON.stringify(lock), "utf8");
  }

  it("exposes assets-lock provenance on list and detail", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "agents", name: "qa-agent", content: AGENT });
    await lockAssetAsUpstream(hub, "agents", "qa-agent");

    expect((await getAsset(hub, "agents", "qa-agent")).provenance?.catalogId).toBe("default");
    const listed = (await listAssets(hub, "agents")).find((asset) => asset.name === "qa-agent");
    expect(listed?.provenance?.source).toBe("https://example.com/repo.git");
  });

  it("blocks edit, rename and convert of an upstream-owned agent", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "agents", name: "qa-agent", content: AGENT });
    await lockAssetAsUpstream(hub, "agents", "qa-agent");

    await expect(updateAsset(hub, "agents", "qa-agent", AGENT)).rejects.toThrow(
      "Asset agents/qa-agent is upstream-owned. Fork it to customize, or edits will be lost on update."
    );
    await expect(renameAsset(hub, "agents", "qa-agent", "other")).rejects.toThrow(/upstream-owned/);
    await expect(convertAssetKind(hub, "agents", "qa-agent", "rules")).rejects.toThrow(/upstream-owned/);
  });

  it("forks an upstream-owned workflow into an editable copy", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "workflows", name: "release", content: "# Release\n" });
    await lockAssetAsUpstream(hub, "workflows", "release");

    const forked = await forkHubAsset(hub, "workflows", "release");

    expect(forked.name).toBe("release-local");
    expect(forked.provenance).toBeNull();
    expect(forked.content).toContain("# Release");
    await expect(updateAsset(hub, "workflows", "release-local", "# Mine\n")).resolves.toBeTruthy();
    await expect(forkHubAsset(hub, "workflows", "release-local")).rejects.toThrow(/not upstream-owned/);
  });

  it("drops the lock entry when an upstream agent is deleted", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "agents", name: "qa-agent", content: AGENT });
    await lockAssetAsUpstream(hub, "agents", "qa-agent");

    await deleteAsset(hub, "agents", "qa-agent");
    await createAsset(hub, { kind: "agents", name: "qa-agent", content: AGENT });

    expect((await getAsset(hub, "agents", "qa-agent")).provenance).toBeNull();
  });
});
