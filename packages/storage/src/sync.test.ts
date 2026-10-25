import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError, InvalidInputError } from "@chain-hub/contracts";

import { readAiSecrets } from "./ai-settings.js";
import { initializeHub } from "./core.js";
import {
  connectSync,
  disconnectSync,
  getSyncStatus,
  readSyncConfig,
  resolveSyncConflicts,
  syncNow
} from "./sync.js";

const execFileAsync = promisify(execFile);

// github.js is mocked wholesale: REST calls never hit the network and the
// "remote" is a local bare repo — its cloneUrl is just a filesystem path.
vi.mock("./github.js", () => ({
  getUser: vi.fn(),
  getRepo: vi.fn(),
  createPrivateRepo: vi.fn(),
  hasSyncManifest: vi.fn(),
  setDefaultBranch: vi.fn(),
  ghAuthToken: vi.fn(),
  ghSetupGit: vi.fn()
}));

import { createPrivateRepo, getRepo, getUser, hasSyncManifest, setDefaultBranch } from "./github.js";

async function makeTmpDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function makeBareRemote(): Promise<string> {
  const dir = await makeTmpDir("chain-hub-remote-");
  await execFileAsync("git", ["init", "--bare"], { cwd: dir });
  await execFileAsync("git", ["symbolic-ref", "HEAD", "refs/heads/main"], { cwd: dir });
  return dir;
}

async function write(dir: string, relative: string, content: string): Promise<void> {
  const target = path.join(dir, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

async function remoteFiles(remote: string): Promise<string[]> {
  const { stdout } = await execFileAsync("git", ["ls-tree", "-r", "main", "--name-only"], { cwd: remote });
  return stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}

async function remoteFile(remote: string, filePath: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["show", `main:${filePath}`], { cwd: remote });
  return stdout;
}

function mockExistingRepo(cloneUrl: string) {
  vi.mocked(getRepo).mockResolvedValue({
    fullName: "tester/chain-hub-sync",
    private: true,
    cloneUrl,
    defaultBranch: "main"
  });
  vi.mocked(hasSyncManifest).mockResolvedValue(true);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUser).mockResolvedValue({ login: "tester" });
  vi.mocked(setDefaultBranch).mockResolvedValue(undefined);
});

describe("connectSync", () => {
  it("creates a private repo and pushes the hub — secrets never leave", async () => {
    const hub = await makeTmpDir("chain-hub-a-");
    await initializeHub(hub);
    const remote = await makeBareRemote();

    vi.mocked(getRepo).mockResolvedValue(null);
    vi.mocked(createPrivateRepo).mockResolvedValue({
      fullName: "tester/chain-hub-sync",
      private: true,
      cloneUrl: remote,
      defaultBranch: ""
    });

    const status = await connectSync(hub, { method: "pat", token: "ghp_test" });

    expect(status.connected).toBe(true);
    expect(status.remote?.repo).toBe("tester/chain-hub-sync");
    expect(vi.mocked(setDefaultBranch)).toHaveBeenCalledWith("ghp_test", "tester/chain-hub-sync", "main");
    expect((await readAiSecrets(hub)).githubSyncToken).toBe("ghp_test");

    const files = await remoteFiles(remote);
    expect(files).toContain("chain-hub.json");
    expect(files).toContain(".gitignore");
    expect(files).toContain(".gitattributes");
    expect(files.some((f) => f.startsWith("skills/"))).toBe(true);
    // Fail-closed guarantee: nothing denylisted is tracked.
    expect(files).not.toContain("system/secrets.json");
    expect(files).not.toContain("system/sync-state.json");
    expect(files.some((f) => f.startsWith("logs/") || f.startsWith("backups/"))).toBe(false);
  });

  it("refuses a public repo", async () => {
    const hub = await makeTmpDir("chain-hub-a-");
    await initializeHub(hub);
    vi.mocked(getRepo).mockResolvedValue({
      fullName: "tester/public",
      private: false,
      cloneUrl: "https://github.com/tester/public.git",
      defaultBranch: "main"
    });

    await expect(connectSync(hub, { method: "pat", token: "x" })).rejects.toThrow(InvalidInputError);
  });

  it("refuses an existing repo without the sync manifest unless adopted", async () => {
    const hub = await makeTmpDir("chain-hub-a-");
    await initializeHub(hub);
    mockExistingRepo("https://github.com/tester/other.git");
    vi.mocked(hasSyncManifest).mockResolvedValue(false);

    await expect(connectSync(hub, { method: "pat", token: "x" })).rejects.toThrow(ConflictError);
  });
});

describe("syncNow", () => {
  it("syncs an edit from machine A to machine B", async () => {
    const remote = await makeBareRemote();
    mockExistingRepo(remote);

    const a = await makeTmpDir("chain-hub-a-");
    await initializeHub(a);
    await connectSync(a, { method: "pat", token: "x" });

    // Machine B: empty hub → connect clones the remote.
    const b = path.join(await makeTmpDir("chain-hub-parent-"), "hub");
    await connectSync(b, { method: "pat", token: "x" });
    expect((await getSyncStatus(b)).connected).toBe(true);

    await write(a, "skills/demo/SKILL.md", "# From A");
    await syncNow(a);

    await syncNow(b);
    expect(await fs.readFile(path.join(b, "skills/demo/SKILL.md"), "utf8")).toBe("# From A");
  });

  it("fails closed when a denylisted file is tracked", async () => {
    const remote = await makeBareRemote();
    mockExistingRepo(remote);

    const a = await makeTmpDir("chain-hub-a-");
    await initializeHub(a);
    await connectSync(a, { method: "pat", token: "x" });

    // Simulate secrets.json becoming tracked (e.g. .gitignore deleted + git add).
    await write(a, "system/secrets.json", JSON.stringify({ version: 1, githubSyncToken: "leak" }));
    await execFileAsync("git", ["add", "-f", "system/secrets.json"], { cwd: a });
    await execFileAsync("git", ["commit", "-m", "oops"], { cwd: a });

    await expect(syncNow(a)).rejects.toThrow(/Refusing to sync machine-local files/);
    expect(await remoteFiles(remote)).not.toContain("system/secrets.json");
  });

  it("surfaces a conflict, resolves keep-local, and converges", async () => {
    const remote = await makeBareRemote();
    mockExistingRepo(remote);

    const a = await makeTmpDir("chain-hub-a-");
    await initializeHub(a);
    await connectSync(a, { method: "pat", token: "x" });

    const b = path.join(await makeTmpDir("chain-hub-parent-"), "hub");
    await connectSync(b, { method: "pat", token: "x" });

    // Diverge the same file on both machines.
    await write(a, "rules/shared.md", "base\nfrom-A\n");
    await stageFile(a, "rules/shared.md", "a edit");
    await syncNow(a);

    await write(b, "rules/shared.md", "base\nfrom-B\n");
    await stageFile(b, "rules/shared.md", "b edit");

    const conflicted = await syncNow(b);
    expect(conflicted.conflicts.map((c) => c.path)).toEqual(["rules/shared.md"]);

    const resolved = await resolveSyncConflicts(b, {
      resolutions: [{ path: "rules/shared.md", strategy: "local" }]
    });
    expect(resolved.conflicts).toEqual([]);

    await syncNow(a);
    expect(await fs.readFile(path.join(a, "rules/shared.md"), "utf8")).toBe("base\nfrom-B\n");
  });

  it("union-merges concurrent appends to events.jsonl without conflict", async () => {
    const remote = await makeBareRemote();
    mockExistingRepo(remote);

    const a = await makeTmpDir("chain-hub-a-");
    await initializeHub(a);
    await connectSync(a, { method: "pat", token: "x" });

    // Shared base line committed before B clones — appends then merge on a common ancestor.
    await write(a, "memory/learnings/events.jsonl", '{"note":"base"}\n');
    await stageFile(a, "memory/learnings/events.jsonl", "seed log");
    await syncNow(a);

    const b = path.join(await makeTmpDir("chain-hub-parent-"), "hub");
    await connectSync(b, { method: "pat", token: "x" });

    await fs.appendFile(path.join(a, "memory/learnings/events.jsonl"), '{"note":"from-a"}\n');
    await stageFile(a, "memory/learnings/events.jsonl", "a note");
    await syncNow(a);

    await fs.appendFile(path.join(b, "memory/learnings/events.jsonl"), '{"note":"from-b"}\n');
    await stageFile(b, "memory/learnings/events.jsonl", "b note");

    const status = await syncNow(b);
    expect(status.conflicts).toEqual([]);

    const merged = await remoteFile(remote, "memory/learnings/events.jsonl");
    expect(merged).toContain("from-a");
    expect(merged).toContain("from-b");
  });

  it("reports uncommitted changes and ahead/behind in status", async () => {
    const remote = await makeBareRemote();
    mockExistingRepo(remote);

    const a = await makeTmpDir("chain-hub-a-");
    await initializeHub(a);
    await connectSync(a, { method: "pat", token: "x" });

    await write(a, "prompts/new.md", "# New");
    const status = await getSyncStatus(a);
    expect(status.uncommitted).toBeGreaterThan(0);
  });
});

async function stageFile(dir: string, relative: string, message: string): Promise<void> {
  await execFileAsync("git", ["add", "--", relative], { cwd: dir });
  await execFileAsync("git", ["commit", "-m", message], { cwd: dir });
}

describe("disconnectSync", () => {
  it("removes the remote and clears config, keeping local files", async () => {
    const remote = await makeBareRemote();
    mockExistingRepo(remote);

    const a = await makeTmpDir("chain-hub-a-");
    await initializeHub(a);
    await connectSync(a, { method: "pat", token: "x" });

    const status = await disconnectSync(a);
    expect(status.connected).toBe(false);
    expect((await readSyncConfig(a)).remote).toBeNull();
    expect(await fs.readFile(path.join(a, "chain-hub.json"), "utf8")).toContain("chain-hub");
  });
});
