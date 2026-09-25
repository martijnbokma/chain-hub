import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { makeExcerpt, pathExists, writeFileAtomic } from "./shared.js";

async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-shared-"));
}

describe("pathExists", () => {
  it("reports files and directories that exist", async () => {
    const dir = await makeTmpDir();
    const file = path.join(dir, "note.md");
    await fs.writeFile(file, "hello", "utf8");

    expect(await pathExists(dir)).toBe(true);
    expect(await pathExists(file)).toBe(true);
  });

  it("returns false for a missing path", async () => {
    const dir = await makeTmpDir();
    expect(await pathExists(path.join(dir, "missing"))).toBe(false);
  });

  it("treats a dangling symlink as existing", async () => {
    const dir = await makeTmpDir();
    const link = path.join(dir, "dangling");
    try {
      await fs.symlink(path.join(dir, "nowhere"), link);
    } catch {
      // Symlinks need extra privileges on some Windows setups; nothing to assert there.
      return;
    }
    expect(await pathExists(link)).toBe(true);
  });
});

describe("writeFileAtomic", () => {
  it("writes content and leaves no temp file behind", async () => {
    const dir = await makeTmpDir();
    const file = path.join(dir, "out.json");
    await writeFileAtomic(file, "{}");

    expect(await fs.readFile(file, "utf8")).toBe("{}");
    expect(await fs.readdir(dir)).toEqual(["out.json"]);
  });
});

describe("makeExcerpt", () => {
  it("drops the first heading and collapses newlines", () => {
    expect(makeExcerpt("# Title\n\nFirst line\nsecond line")).toBe("First line second line");
  });

  it("truncates long content with an ellipsis", () => {
    expect(makeExcerpt("a".repeat(10), 4)).toBe("aaaa…");
  });
});
