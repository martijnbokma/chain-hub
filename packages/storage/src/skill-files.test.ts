import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { initializeHub } from "./core.js";
import { listSkillFiles, readSkillFile } from "./skill-files.js";

async function makeHubWithSkill(): Promise<string> {
  const hub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-files-"));
  await initializeHub(hub);
  const skillDir = path.join(hub, "skills", "demo");
  await fs.mkdir(path.join(skillDir, "scripts"), { recursive: true });
  await fs.writeFile(path.join(skillDir, "SKILL.md"), "# Demo", "utf8");
  await fs.writeFile(path.join(skillDir, "scripts", "run.sh"), "echo hi", "utf8");
  await fs.writeFile(path.join(skillDir, "README.md"), "readme", "utf8");
  return hub;
}

describe("listSkillFiles", () => {
  it("lists sidecar files and folders sorted by path, without SKILL.md", async () => {
    const hub = await makeHubWithSkill();

    expect(await listSkillFiles(hub, "demo")).toEqual([
      { path: "README.md", size: 6, isDirectory: false },
      { path: "scripts", size: 0, isDirectory: true },
      { path: "scripts/run.sh", size: 7, isDirectory: false }
    ]);
  });

  it("reports a missing skill", async () => {
    const hub = await makeHubWithSkill();
    await expect(listSkillFiles(hub, "nope")).rejects.toThrow("Asset not found: skills/nope");
  });
});

describe("readSkillFile", () => {
  it("reads a nested sidecar file", async () => {
    const hub = await makeHubWithSkill();

    expect(await readSkillFile(hub, "demo", "scripts/run.sh")).toEqual({
      path: "scripts/run.sh",
      content: "echo hi",
      size: 7,
      truncated: false
    });
  });

  it("rejects paths that leave the skill folder", async () => {
    const hub = await makeHubWithSkill();
    await expect(readSkillFile(hub, "demo", "../welcome/SKILL.md")).rejects.toThrow();
  });

  it("rejects folders and missing files", async () => {
    const hub = await makeHubWithSkill();
    await expect(readSkillFile(hub, "demo", "scripts")).rejects.toThrow("Not a file: scripts");
    await expect(readSkillFile(hub, "demo", "missing.md")).rejects.toThrow("Skill file not found: missing.md");
  });

  it("rejects a symlink that points outside the skill folder", async () => {
    const hub = await makeHubWithSkill();
    const outside = path.join(hub, "system", "meta.json");
    try {
      await fs.symlink(outside, path.join(hub, "skills", "demo", "leak.json"));
    } catch {
      // Symlinks need extra privileges on some Windows setups; nothing to assert there.
      return;
    }
    await expect(readSkillFile(hub, "demo", "leak.json")).rejects.toThrow("Unsafe skill file path: leak.json");
  });
});
