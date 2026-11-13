import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail } from "@chain-hub/contracts";

import { removeHook, syncHooks, writeHook } from "./hooks-config.js";

async function makeTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-hooks-test-"));
}

function hookAsset(name: string, event = "PostToolUse"): AssetDetail {
  return {
    id: `hooks:${name}`,
    kind: "hooks",
    name,
    relativePath: `hooks/${name}.md`,
    updatedAt: new Date().toISOString(),
    content: `---\nevent: ${event}\nmatcher: "Edit|Write"\n---\n\nnpx eslint --fix "$FILE"`
  };
}

describe("writeHook / removeHook", () => {
  it("writes a marked settings entry and a script file, then removes both", async () => {
    const home = await makeTmp();
    const settings = path.join(home, ".claude", "settings.json");
    const dir = path.join(home, ".claude", "hooks");

    await writeHook(settings, dir, hookAsset("lint-fix"));

    const config = JSON.parse(await fs.readFile(settings, "utf8"));
    const entry = config.hooks.PostToolUse[0];
    expect(entry.matcher).toBe("Edit|Write");
    expect(entry._chain_hub_source).toBe("hooks/lint-fix");
    expect(entry.hooks[0].command).toContain("lint-fix.sh");

    const script = await fs.readFile(path.join(dir, "lint-fix.sh"), "utf8");
    expect(script).toContain("# chain-hub:managed");
    expect(script).toContain("eslint --fix");

    await removeHook(settings, dir, "hooks", "lint-fix");
    const after = JSON.parse(await fs.readFile(settings, "utf8"));
    expect(after.hooks.PostToolUse ?? []).toHaveLength(0);
    await expect(fs.stat(path.join(dir, "lint-fix.sh"))).rejects.toThrow();
  });

  it("keeps foreign hook entries and foreign settings keys", async () => {
    const home = await makeTmp();
    const settings = path.join(home, ".claude", "settings.json");
    const dir = path.join(home, ".claude", "hooks");
    await fs.mkdir(path.dirname(settings), { recursive: true });
    await fs.writeFile(settings, JSON.stringify({ theme: "dark", hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "mine.sh" }] }] } }), "utf8");

    await writeHook(settings, dir, hookAsset("lint-fix"));

    const config = JSON.parse(await fs.readFile(settings, "utf8"));
    expect(config.theme).toBe("dark");
    expect(config.hooks.PreToolUse[0].command ?? config.hooks.PreToolUse[0].hooks[0].command).toBe("mine.sh");
  });
});

describe("syncHooks", () => {
  it("rebuilds managed entries and drops stale ones", async () => {
    const home = await makeTmp();
    const settings = path.join(home, ".claude", "settings.json");
    const dir = path.join(home, ".claude", "hooks");
    await fs.mkdir(path.dirname(settings), { recursive: true });
    await fs.writeFile(settings, JSON.stringify({ hooks: { PostToolUse: [{ hooks: [{ type: "command", command: "old" }], _chain_hub_source: "hooks/stale" }] } }), "utf8");

    await syncHooks(settings, dir, [hookAsset("a"), hookAsset("b", "PreToolUse")]);

    const config = JSON.parse(await fs.readFile(settings, "utf8"));
    expect(config.hooks.PostToolUse.some((e: Record<string, unknown>) => e._chain_hub_source === "hooks/stale")).toBe(false);
    expect(config.hooks.PostToolUse).toHaveLength(1);
    expect(config.hooks.PreToolUse).toHaveLength(1);
  });
});
