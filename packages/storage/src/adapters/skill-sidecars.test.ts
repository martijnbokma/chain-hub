import { mkdtempSync, rmSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SIDECAR_MANIFEST } from "../skill-copy.js";
import { projectSkillSidecars, removeEditorSkillDirectory } from "./skill-sidecars.js";

let tmp: string;
let chainHome: string;
let editorDir: string;

beforeEach(async () => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "sidecars-"));
  chainHome = path.join(tmp, "hub");
  editorDir = path.join(tmp, "editor", "my-skill");
  await fs.mkdir(path.join(chainHome, "skills", "my-skill"), { recursive: true });
});

afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("projectSkillSidecars", () => {
  it("copies sidecar entries, skips SKILL.md, and writes a manifest", async () => {
    await fs.writeFile(path.join(chainHome, "skills", "my-skill", "SKILL.md"), "# skill");
    await fs.mkdir(path.join(chainHome, "skills", "my-skill", "scripts"));
    await fs.writeFile(path.join(chainHome, "skills", "my-skill", "scripts", "run.sh"), "#!/bin/sh\n");

    await projectSkillSidecars(chainHome, editorDir, "my-skill");

    expect(await fs.readFile(path.join(editorDir, "scripts", "run.sh"), "utf8")).toContain("#!/bin/sh");
    expect(JSON.parse(await fs.readFile(path.join(editorDir, SIDECAR_MANIFEST), "utf8"))).toEqual(["scripts"]);
  });

  it("removes stale projected entries but keeps user-added files", async () => {
    await fs.writeFile(path.join(chainHome, "skills", "my-skill", "SKILL.md"), "# skill");
    await fs.mkdir(editorDir, { recursive: true });
    await fs.writeFile(path.join(editorDir, SIDECAR_MANIFEST), JSON.stringify(["old-ref", "mine"]));
    await fs.mkdir(path.join(editorDir, "old-ref"));
    await fs.writeFile(path.join(editorDir, "mine.txt"), "user file");

    await projectSkillSidecars(chainHome, editorDir, "my-skill");

    // "old-ref" was in the manifest and is gone; "mine.txt" was never projected, so it survives.
    await expect(fs.stat(path.join(editorDir, "old-ref"))).rejects.toThrow();
    expect(await fs.readFile(path.join(editorDir, "mine.txt"), "utf8")).toBe("user file");
    await expect(fs.stat(path.join(editorDir, SIDECAR_MANIFEST))).rejects.toThrow();
  });

  it("is a no-op when the hub skill does not exist", async () => {
    await projectSkillSidecars(chainHome, editorDir, "missing-skill");
    await expect(fs.stat(editorDir)).rejects.toThrow();
  });
});

describe("removeEditorSkillDirectory", () => {
  it("removes the folder and tolerates a missing folder", async () => {
    await fs.mkdir(editorDir, { recursive: true });
    await removeEditorSkillDirectory(editorDir);
    await expect(fs.stat(editorDir)).rejects.toThrow();
    await removeEditorSkillDirectory(editorDir); // no throw
  });
});
