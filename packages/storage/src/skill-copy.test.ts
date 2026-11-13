import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { copySkillTree, createSkillCopyFilter, SIDECAR_MANIFEST, SKIPPED_SKILL_ENTRIES } from "./skill-copy.js";

async function makeTmpDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("skill-copy", () => {
  it("copies the tree and skips VCS metadata and the sidecar manifest", async () => {
    const src = await makeTmpDir("chain-hub-copy-src-");
    const dest = await makeTmpDir("chain-hub-copy-dest-");
    await fs.writeFile(path.join(src, "SKILL.md"), "# s\n", "utf8");
    await fs.mkdir(path.join(src, ".git"), { recursive: true });
    await fs.writeFile(path.join(src, ".git", "HEAD"), "ref", "utf8");
    await fs.writeFile(path.join(src, SIDECAR_MANIFEST), "{}", "utf8");

    await copySkillTree(src, dest);

    expect(await fs.readFile(path.join(dest, "SKILL.md"), "utf8")).toBe("# s\n");
    await expect(fs.stat(path.join(dest, ".git"))).rejects.toThrow();
    await expect(fs.stat(path.join(dest, SIDECAR_MANIFEST))).rejects.toThrow();
  });

  it("copies nested directories", async () => {
    const src = await makeTmpDir("chain-hub-copy-src-");
    const dest = await makeTmpDir("chain-hub-copy-dest-");
    await fs.mkdir(path.join(src, "scripts"), { recursive: true });
    await fs.writeFile(path.join(src, "scripts", "run.sh"), "echo hi", "utf8");

    await copySkillTree(src, dest);
    expect(await fs.readFile(path.join(dest, "scripts", "run.sh"), "utf8")).toBe("echo hi");
  });

  it("filter accepts regular files and rejects skipped entries", async () => {
    const src = await makeTmpDir("chain-hub-copy-src-");
    const filter = await createSkillCopyFilter(src);
    const inside = path.join(src, "a.md");
    const skipped = path.join(src, ".hg");
    await fs.writeFile(inside, "x", "utf8");
    await fs.mkdir(skipped, { recursive: true });
    await fs.writeFile(path.join(skipped, "x"), "x", "utf8");

    expect(await filter(inside)).toBe(true);
    expect(await filter(skipped)).toBe(false);
    expect(SKIPPED_SKILL_ENTRIES.has(SIDECAR_MANIFEST)).toBe(true);
  });
});
