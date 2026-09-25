import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

import { fetchRemoteHeadSha, resolveGitSkillDir } from "./skill-git.js";

const execFileAsync = promisify(execFile);

async function makeRepo(files: Record<string, string>): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-git-"));
  for (const [relative, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(repo, relative)), { recursive: true });
    await fs.writeFile(path.join(repo, relative), content, "utf8");
  }
  await execFileAsync("git", ["init"], { cwd: repo });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
  await execFileAsync("git", ["add", "."], { cwd: repo });
  await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });
  return repo;
}

describe("fetchRemoteHeadSha", () => {
  it("returns the HEAD commit of a repository", async () => {
    const repo = await makeRepo({ "SKILL.md": "# Demo" });
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repo });

    expect(await fetchRemoteHeadSha(repo)).toBe(stdout.trim());
  });
});

describe("resolveGitSkillDir", () => {
  it("finds the only nested skill and reports its subdir", async () => {
    const repo = await makeRepo({ "skills/demo/SKILL.md": "# Demo", "README.md": "readme" });

    const resolved = await resolveGitSkillDir(repo, undefined, "unrelated-name");
    try {
      expect(resolved.detectedSubdir).toBe("skills/demo");
      expect(resolved.commitSha).toMatch(/^[0-9a-f]{40}$/);
    } finally {
      await fs.rm(resolved.cleanupDir, { recursive: true, force: true });
    }
  });

  it("asks for a subdir when several skills match", async () => {
    const repo = await makeRepo({ "a/SKILL.md": "# A", "b/SKILL.md": "# B" });

    await expect(resolveGitSkillDir(repo, undefined, "unrelated-name")).rejects.toThrow(/Found skills in: a, b/);
  });
});
