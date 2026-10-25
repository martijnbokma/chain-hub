import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

import {
  aheadBehind,
  cloneRepo,
  commitAll,
  dirtyCount,
  ensureIdentity,
  fetchOrigin,
  finishMerge,
  hasCommits,
  headSha,
  initRepo,
  isGitAvailable,
  mergeInProgress,
  pullMerge,
  pullRebase,
  push,
  rebaseAbort,
  removeRemote,
  resolvePath,
  setRemote,
  stageAll,
  stagedPaths,
  trackedFiles,
  unmergedPaths
} from "./sync-git.js";

const execFileAsync = promisify(execFile);

async function makeTmpDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function write(dir: string, relative: string, content: string): Promise<void> {
  const target = path.join(dir, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

/** Local repo with identity + first commit, pointed at a bare remote. */
async function makeRepo(remote: string, files: Record<string, string> = {}): Promise<string> {
  const dir = await makeTmpDir("chain-hub-sync-a-");
  await initRepo(dir);
  await ensureIdentity(dir);
  for (const [relative, content] of Object.entries(files)) {
    await write(dir, relative, content);
  }
  await stageAll(dir);
  await commitAll(dir, "init");
  await setRemote(dir, remote);
  await push(dir);
  return dir;
}

async function makeBareRemote(): Promise<string> {
  const dir = await makeTmpDir("chain-hub-remote-");
  await execFileAsync("git", ["init", "--bare"], { cwd: dir });
  // `init --bare` points HEAD at "master"; sync works on "main".
  await execFileAsync("git", ["symbolic-ref", "HEAD", "refs/heads/main"], { cwd: dir });
  return dir;
}

describe("sync-git", () => {
  it("git is available and a repo initializes with commits", async () => {
    expect(await isGitAvailable()).toBe(true);
    const dir = await makeTmpDir("chain-hub-sync-init-");
    await initRepo(dir);
    await ensureIdentity(dir);
    expect(await hasCommits(dir)).toBe(false);
    await write(dir, "skills/demo/SKILL.md", "# Demo");
    await stageAll(dir);
    expect(await stagedPaths(dir)).toEqual(["skills/demo/SKILL.md"]);
    await commitAll(dir, "init");
    expect(await hasCommits(dir)).toBe(true);
    expect(await headSha(dir)).toMatch(/^[0-9a-f]{40}$/);
    expect(await trackedFiles(dir)).toContain("skills/demo/SKILL.md");
    expect(await dirtyCount(dir)).toBe(0);
  });

  it("pushes to a bare remote and clones it back", async () => {
    const remote = await makeBareRemote();
    const a = await makeRepo(remote, { "prompts/x.md": "# X" });

    const b = await makeTmpDir("chain-hub-sync-b-");
    await fs.rm(b, { recursive: true });
    await cloneRepo(remote, b);

    expect(await trackedFiles(b)).toContain("prompts/x.md");
    const sha = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: b })).stdout.trim();
    expect(await headSha(a)).toBe(sha);
  });

  it("converges non-conflicting edits from two machines via pull --rebase", async () => {
    const remote = await makeBareRemote();
    const a = await makeRepo(remote, { "skills/a/SKILL.md": "# A v1" });
    const b = await makeTmpDir("chain-hub-sync-b-");
    await fs.rm(b, { recursive: true });
    await cloneRepo(remote, b);
    await ensureIdentity(b);

    // Machine A edits its file; machine B edits a different file.
    await write(a, "skills/a/SKILL.md", "# A v2");
    await stageAll(a);
    await commitAll(a, "a edit");
    await push(a);

    await write(b, "skills/b/SKILL.md", "# B v1");
    await stageAll(b);
    await commitAll(b, "b edit");
    await fetchOrigin(b);

    const result = await pullRebase(b);
    expect(result).toEqual(expect.objectContaining({ ok: true, conflict: false }));
    await push(b);

    // Both ends converged: B has A's file version and vice versa after A pulls.
    expect(await fs.readFile(path.join(b, "skills/a/SKILL.md"), "utf8")).toBe("# A v2");
    await fetchOrigin(a);
    expect(await pullRebase(a)).toEqual(expect.objectContaining({ ok: true }));
    expect(await fs.readFile(path.join(a, "skills/b/SKILL.md"), "utf8")).toBe("# B v1");
    expect(await aheadBehind(a)).toEqual({ ahead: 0, behind: 0 });
  });

  it("surfaces a same-file conflict, resolves keep-local, and pushes", async () => {
    const remote = await makeBareRemote();
    const a = await makeRepo(remote, { "rules/r.md": "line1\nshared\n" });
    const b = await makeTmpDir("chain-hub-sync-b-");
    await fs.rm(b, { recursive: true });
    await cloneRepo(remote, b);
    await ensureIdentity(b);

    await write(a, "rules/r.md", "line1\nfrom-A\n");
    await stageAll(a);
    await commitAll(a, "a edit");
    await push(a);

    await write(b, "rules/r.md", "line1\nfrom-B\n");
    await stageAll(b);
    await commitAll(b, "b edit");
    await fetchOrigin(b);

    const rebase = await pullRebase(b);
    expect(rebase.ok).toBe(false);
    expect(rebase.conflict).toBe(true);

    // Spec flow: abort the rebase and convert to a plain merge.
    await rebaseAbort(b);
    const merge = await pullMerge(b);
    expect(merge.conflict).toBe(true);
    expect(await mergeInProgress(b)).toBe(true);
    expect(await unmergedPaths(b)).toEqual(["rules/r.md"]);

    await resolvePath(b, "local", "rules/r.md");
    await finishMerge(b);
    expect(await mergeInProgress(b)).toBe(false);
    await push(b);

    await fetchOrigin(a);
    await pullRebase(a);
    expect(await fs.readFile(path.join(a, "rules/r.md"), "utf8")).toBe("line1\nfrom-B\n");
  });

  it("manages the remote: add, set-url, remove", async () => {
    const remote = await makeBareRemote();
    const dir = await makeTmpDir("chain-hub-sync-r-");
    await initRepo(dir);

    await setRemote(dir, remote);
    await setRemote(dir, `${remote}-v2`);
    const url = (await execFileAsync("git", ["remote", "get-url", "origin"], { cwd: dir })).stdout.trim();
    expect(url).toBe(`${remote}-v2`);

    await removeRemote(dir);
    await expect(
      execFileAsync("git", ["remote", "get-url", "origin"], { cwd: dir })
    ).rejects.toThrow();
  });
});
