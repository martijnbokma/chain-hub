import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { InvalidInputError } from "@chain-hub/contracts";

import { pathExists } from "./shared.js";

// Git access for hub sync: init/commit/pull/push plus merge-conflict probes.
// Same execFile pattern as skill-git.ts; a PAT is passed as a per-invocation
// auth header (the github-actions pattern) so it never lands in .git/config.

const execFileAsync = promisify(execFile);

const GIT_OP_TIMEOUT_MS = 120_000;
const GIT_STATUS_TIMEOUT_MS = 15_000;

export const SYNC_BRANCH = "main";
const SYNC_REMOTE = "origin";

export type GitResult = { code: number; stdout: string; stderr: string };

type GitRunOptions = { cwd: string; token?: string; timeout?: number };

function gitEnv(): NodeJS.ProcessEnv {
  // Never block on a credential prompt: no terminal prompt, and `true` as
  // askpass yields an empty credential instead of a GUI prompt.
  return { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "true" };
}

function gitArgs(token: string | undefined, args: string[]): string[] {
  if (!token) return args;
  // Chain-managed credential: clear ambient helpers and pass the token as a
  // per-invocation auth header — it is never written to disk or the remote URL.
  const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
  return [
    "-c", "credential.helper=",
    "-c", `http.https://github.com/.extraheader=AUTHORIZATION: Basic ${basic}`,
    ...args
  ];
}

/** git that returns an exit-code result instead of throwing — for probes and operations where non-zero is data (conflicts). */
async function tryGit(args: string[], options: GitRunOptions): Promise<GitResult> {
  const { cwd, token, timeout = GIT_OP_TIMEOUT_MS } = options;
  try {
    const { stdout, stderr } = await execFileAsync("git", gitArgs(token, args), {
      cwd,
      env: gitEnv(),
      timeout,
      maxBuffer: 16 * 1024 * 1024
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const e = error as { code?: number | string; stdout?: string; stderr?: string };
    return {
      code: typeof e.code === "number" ? e.code : 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? (error instanceof Error ? error.message : String(error))
    };
  }
}

async function runGit(args: string[], options: GitRunOptions): Promise<string> {
  const result = await tryGit(args, options);
  if (result.code !== 0) {
    throw new InvalidInputError(`git ${args[0]} failed: ${result.stderr.trim() || result.stdout.trim()}`);
  }
  return result.stdout;
}

export async function isGitAvailable(): Promise<boolean> {
  const result = await tryGit(["--version"], { cwd: os.tmpdir(), timeout: GIT_STATUS_TIMEOUT_MS });
  return result.code === 0;
}

export function isGitRepo(dir: string): Promise<boolean> {
  return pathExists(path.join(dir, ".git"));
}

export async function initRepo(dir: string): Promise<void> {
  await runGit(["init", "-b", SYNC_BRANCH], { cwd: dir });
}

/** Repo-local committer identity — sync must not depend on the user's global git config. */
export async function ensureIdentity(dir: string): Promise<void> {
  const email = await tryGit(["config", "user.email"], { cwd: dir, timeout: GIT_STATUS_TIMEOUT_MS });
  if (email.code !== 0 || !email.stdout.trim()) {
    await runGit(["config", "user.email", "chain-hub@localhost"], { cwd: dir });
  }
  const name = await tryGit(["config", "user.name"], { cwd: dir, timeout: GIT_STATUS_TIMEOUT_MS });
  if (name.code !== 0 || !name.stdout.trim()) {
    await runGit(["config", "user.name", "Chain Hub"], { cwd: dir });
  }
}

export async function cloneRepo(url: string, dir: string, token?: string): Promise<void> {
  // `--` stops a url like `--upload-pack=…` from being parsed as an option.
  await runGit(["clone", "--", url, dir], { cwd: os.tmpdir(), token });
}

/** Land on `main` after a clone whose remote default is another branch (e.g. master). */
export async function ensureMainBranch(dir: string): Promise<void> {
  const current = await tryGit(["symbolic-ref", "--short", "HEAD"], {
    cwd: dir,
    timeout: GIT_STATUS_TIMEOUT_MS
  });
  if (current.code === 0 && current.stdout.trim() === SYNC_BRANCH) return;
  const remoteMain = await tryGit(["rev-parse", "--verify", `${SYNC_REMOTE}/${SYNC_BRANCH}`], {
    cwd: dir,
    timeout: GIT_STATUS_TIMEOUT_MS
  });
  if (remoteMain.code === 0) {
    await runGit(["checkout", "-B", SYNC_BRANCH, `${SYNC_REMOTE}/${SYNC_BRANCH}`], { cwd: dir });
    await tryGit(["branch", "--set-upstream-to", `${SYNC_REMOTE}/${SYNC_BRANCH}`, SYNC_BRANCH], { cwd: dir });
  }
}

export async function hasRemote(dir: string, name = SYNC_REMOTE): Promise<boolean> {
  const remotes = await runGit(["remote"], { cwd: dir, timeout: GIT_STATUS_TIMEOUT_MS });
  return remotes.split("\n").map((line) => line.trim()).includes(name);
}

export async function setRemote(dir: string, url: string, name = SYNC_REMOTE): Promise<void> {
  if (await hasRemote(dir, name)) {
    await runGit(["remote", "set-url", name, url], { cwd: dir });
  } else {
    await runGit(["remote", "add", name, url], { cwd: dir });
  }
}

export async function removeRemote(dir: string, name = SYNC_REMOTE): Promise<void> {
  if (await hasRemote(dir, name)) {
    await runGit(["remote", "remove", name], { cwd: dir });
  }
}

export async function stageAll(dir: string): Promise<void> {
  await runGit(["add", "-A"], { cwd: dir });
}

/** Paths staged for the next commit — the denylist check reads this. */
export async function stagedPaths(dir: string): Promise<string[]> {
  const out = await runGit(["diff", "--cached", "--name-only"], { cwd: dir, timeout: GIT_STATUS_TIMEOUT_MS });
  return out.split("\n").map((line) => line.trim()).filter(Boolean);
}

export async function hasCommits(dir: string): Promise<boolean> {
  const result = await tryGit(["rev-parse", "--verify", "HEAD"], { cwd: dir, timeout: GIT_STATUS_TIMEOUT_MS });
  return result.code === 0;
}

export async function headSha(dir: string): Promise<string | null> {
  const result = await tryGit(["rev-parse", "HEAD"], { cwd: dir, timeout: GIT_STATUS_TIMEOUT_MS });
  return result.code === 0 ? result.stdout.trim() : null;
}

export async function commitAll(dir: string, message: string): Promise<void> {
  await runGit(["commit", "-m", message], { cwd: dir });
}

/** Completes an in-progress merge without opening an editor. */
export async function finishMerge(dir: string): Promise<void> {
  if (await mergeInProgress(dir)) {
    await runGit(["commit", "--no-edit"], { cwd: dir });
  } else {
    await commitAll(dir, `sync: merge ${new Date().toISOString()}`);
  }
}

export async function fetchOrigin(dir: string, token?: string): Promise<void> {
  await runGit(["fetch", SYNC_REMOTE], { cwd: dir, token });
}

export async function aheadBehind(dir: string): Promise<{ ahead: number; behind: number }> {
  const result = await tryGit(
    ["rev-list", "--left-right", "--count", `HEAD...${SYNC_REMOTE}/${SYNC_BRANCH}`],
    { cwd: dir, timeout: GIT_STATUS_TIMEOUT_MS }
  );
  if (result.code !== 0) return { ahead: 0, behind: 0 };
  const [ahead, behind] = result.stdout.trim().split(/\s+/).map(Number);
  return { ahead: ahead || 0, behind: behind || 0 };
}

/** Unmerged (conflicted) paths during a merge — powers status.conflicts. */
export async function unmergedPaths(dir: string): Promise<string[]> {
  const result = await tryGit(["diff", "--name-only", "--diff-filter=U"], {
    cwd: dir,
    timeout: GIT_STATUS_TIMEOUT_MS
  });
  if (result.code !== 0) return [];
  return result.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}

/** Number of modified/untracked entries — "uncommitted" in SyncStatus. */
export async function dirtyCount(dir: string): Promise<number> {
  const result = await tryGit(["status", "--porcelain"], { cwd: dir, timeout: GIT_STATUS_TIMEOUT_MS });
  if (result.code !== 0) return 0;
  return result.stdout.split("\n").filter((line) => line.trim().length > 0).length;
}

export type PullResult = { ok: boolean; conflict: boolean; stderr: string };

export async function isRebasing(dir: string): Promise<boolean> {
  return (
    (await pathExists(path.join(dir, ".git", "rebase-merge"))) ||
    (await pathExists(path.join(dir, ".git", "rebase-apply")))
  );
}

export async function rebaseAbort(dir: string): Promise<void> {
  if (await isRebasing(dir)) {
    await tryGit(["rebase", "--abort"], { cwd: dir });
  }
}

export async function pullRebase(dir: string, token?: string): Promise<PullResult> {
  const result = await tryGit(["pull", "--rebase", "--autostash", SYNC_REMOTE, SYNC_BRANCH], {
    cwd: dir,
    token
  });
  if (result.code === 0) return { ok: true, conflict: false, stderr: result.stderr };
  const conflict = (await isRebasing(dir)) || (await unmergedPaths(dir)).length > 0;
  return { ok: false, conflict, stderr: result.stderr };
}

export async function pullMerge(dir: string, token?: string): Promise<PullResult> {
  const result = await tryGit(["pull", "--no-rebase", SYNC_REMOTE, SYNC_BRANCH], {
    cwd: dir,
    token
  });
  if (result.code === 0) return { ok: true, conflict: false, stderr: result.stderr };
  const conflict = (await mergeInProgress(dir)) || (await unmergedPaths(dir)).length > 0;
  return { ok: false, conflict, stderr: result.stderr };
}

export async function mergeInProgress(dir: string): Promise<boolean> {
  return pathExists(path.join(dir, ".git", "MERGE_HEAD"));
}

/** True once `origin/main` exists on the remote — distinguishes "never pushed" from "pushed". */
export async function remoteBranchExists(dir: string): Promise<boolean> {
  const result = await tryGit(["rev-parse", "--verify", `${SYNC_REMOTE}/${SYNC_BRANCH}`], {
    cwd: dir,
    timeout: GIT_STATUS_TIMEOUT_MS
  });
  return result.code === 0;
}

/** Stage a single path (manual conflict resolution — the user already edited it). */
export async function addPath(dir: string, filePath: string): Promise<void> {
  await runGit(["add", "--", filePath], { cwd: dir });
}

export async function push(dir: string, token?: string): Promise<void> {
  await runGit(["push", "-u", SYNC_REMOTE, SYNC_BRANCH], { cwd: dir, token });
}

/** Resolve one conflicted path to the local ("ours") or remote ("theirs") version. */
export async function resolvePath(dir: string, strategy: "local" | "remote", filePath: string): Promise<void> {
  const stage = strategy === "local" ? "--ours" : "--theirs";
  await runGit(["checkout", stage, "--", filePath], { cwd: dir });
  await runGit(["add", "--", filePath], { cwd: dir });
}

/** All files the repo tracks — lets tests assert the denylist never reaches the remote. */
export async function trackedFiles(dir: string): Promise<string[]> {
  const out = await runGit(["ls-files"], { cwd: dir, timeout: GIT_STATUS_TIMEOUT_MS });
  return out.split("\n").map((line) => line.trim()).filter(Boolean);
}
