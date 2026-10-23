import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { zedConfigDir } from "./adapters/zed.js";
import { createAsset, initializeHub } from "./core.js";
import { isEditorInstalled, syncAssetToEditors } from "./integrations.js";

// Adapters write under process.env.HOME (see resolveHomeDir); keep every test in a throwaway home.
const originalHome = process.env.HOME;
let tmpHome: string;

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-integrations-home-"));
  process.env.HOME = tmpHome;
});

afterEach(() => {
  process.env.HOME = originalHome;
});

async function exists(target: string): Promise<boolean> {
  return fs.lstat(target).then(
    () => true,
    () => false
  );
}

describe("isEditorInstalled", () => {
  it("detects Windsurf from any of its config roots", async () => {
    expect(await isEditorInstalled("windsurf", tmpHome)).toBe(false);
    await fs.mkdir(path.join(tmpHome, ".windsurf"), { recursive: true });
    expect(await isEditorInstalled("windsurf", tmpHome)).toBe(true);
  });

  it("detects Devin CLI from ~/.devin or its platform config folder", async () => {
    expect(await isEditorInstalled("devin", tmpHome)).toBe(false);
    await fs.mkdir(path.join(tmpHome, ".devin"), { recursive: true });
    expect(await isEditorInstalled("devin", tmpHome)).toBe(true);
  });

  it("detects Zed from its platform config folder", async () => {
    expect(await isEditorInstalled("zed", tmpHome)).toBe(false);
    await fs.mkdir(zedConfigDir(tmpHome), { recursive: true });
    expect(await isEditorInstalled("zed", tmpHome)).toBe(true);
  });

  it("returns false for an unknown editor id", async () => {
    expect(await isEditorInstalled("unknown-editor", tmpHome)).toBe(false);
  });
});

describe("syncAssetToEditors", () => {
  it("writes to installed editors only and removes the projection when the asset is gone", async () => {
    const hub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-integrations-hub-"));
    await initializeHub(hub);
    await fs.mkdir(path.join(tmpHome, ".claude"), { recursive: true });
    const asset = await createAsset(hub, { kind: "rules", name: "style", content: "# Style\n\nUse tabs." });

    await syncAssetToEditors(hub, "rules", "style", asset);

    const claudeRule = path.join(tmpHome, ".claude", "rules", "style.md");
    expect(await exists(claudeRule)).toBe(true);
    expect(await exists(path.join(tmpHome, ".cursor"))).toBe(false);

    await syncAssetToEditors(hub, "rules", "style", null);

    expect(await exists(claudeRule)).toBe(false);
  });
});
