import { execFile } from "node:child_process";
import { type Dirent, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { assertSafeRelativeSkillPath, InvalidInputError, normalizeSkillName } from "@chain-hub/contracts";

import { pathExists } from "./shared.js";

// Git access for skill installs: shallow clones, SKILL.md discovery and remote HEAD probes.

const execFileAsync = promisify(execFile);

const GIT_CLONE_TIMEOUT_MS = 120_000;
const GIT_LS_REMOTE_TIMEOUT_MS = 15_000;

/** Never block the server on an interactive credential prompt. */
function gitEnv(): NodeJS.ProcessEnv {
  return { ...process.env, GIT_TERMINAL_PROMPT: "0" };
}

async function findSkillDirsInRepo(baseDir: string): Promise<string[]> {
  const IGNORED_DIRS = new Set([
    ".git",
    "node_modules",
    "dist",
    "build",
    "target",
    "coverage",
    ".cache",
    ".idea",
    ".vscode",
    "tests",
    "test",
    "fixtures"
  ]);

  const skillDirs: string[] = [];

  async function walk(currentDir: string, depth: number): Promise<void> {
    if (depth > 6) return;
    let entries: Dirent[];
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    const hasSkillMd = entries.some(
      (e) => (e.isFile() || e.isSymbolicLink()) && e.name.toLowerCase() === "skill.md"
    );
    if (hasSkillMd && currentDir !== baseDir) {
      skillDirs.push(currentDir);
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
        await walk(path.join(currentDir, entry.name), depth + 1);
      }
    }
  }

  await walk(baseDir, 0);
  return skillDirs;
}

export async function resolveGitSkillDir(repo: string, subdir: string | undefined, nameHint: string | undefined): Promise<{
  cleanupDir: string;
  sourceDir: string;
  commitSha: string | null;
  detectedSubdir?: string;
}> {
  const cleanupDir = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-clone-"));

  try {
    // `--` stops a repo value like `--upload-pack=…` from being parsed as an option.
    await execFileAsync("git", ["clone", "--depth", "1", "--", repo, cleanupDir], {
      env: gitEnv(),
      timeout: GIT_CLONE_TIMEOUT_MS
    });
  } catch (error) {
    await fs.rm(cleanupDir, { recursive: true, force: true });
    const message = error instanceof Error ? error.message : String(error);
    throw new InvalidInputError(`Failed to clone skill repo ${repo}: ${message}`);
  }

  let commitSha: string | null = null;
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: cleanupDir,
      timeout: 5000
    });
    commitSha = stdout.trim() || null;
  } catch {
    commitSha = null;
  }

  const candidates: string[] = [];

  if (subdir) {
    candidates.push(path.join(cleanupDir, assertSafeRelativeSkillPath(subdir)));
  }

  candidates.push(cleanupDir);

  const inferredName = nameHint || path.basename(repo).replace(/\.git$/, "");
  const safeNameHint = inferredName ? normalizeSkillName(inferredName) : "";
  if (safeNameHint) {
    candidates.push(path.join(cleanupDir, safeNameHint));
    candidates.push(path.join(cleanupDir, "skills", safeNameHint));
  }

  for (const candidate of candidates) {
    if (await pathExists(path.join(candidate, "SKILL.md"))) {
      const detectedSubdir =
        candidate === cleanupDir
          ? undefined
          : path.relative(cleanupDir, candidate).replace(/\\/g, "/");
      return { cleanupDir, sourceDir: candidate, commitSha, detectedSubdir };
    }
  }

  if (!subdir) {
    const discovered = await findSkillDirsInRepo(cleanupDir);
    if (discovered.length > 0) {
      discovered.sort((a, b) => a.length - b.length);

      if (safeNameHint) {
        const matching = discovered.find((dir) => {
          const base = normalizeSkillName(path.basename(dir));
          return base === safeNameHint;
        });
        if (matching) {
          const detectedSubdir = path.relative(cleanupDir, matching).replace(/\\/g, "/");
          return { cleanupDir, sourceDir: matching, commitSha, detectedSubdir };
        }
      }

      if (discovered.length === 1) {
        const detectedSubdir = path.relative(cleanupDir, discovered[0]).replace(/\\/g, "/");
        return { cleanupDir, sourceDir: discovered[0], commitSha, detectedSubdir };
      }

      const relativeList = discovered.map((dir) => path.relative(cleanupDir, dir).replace(/\\/g, "/"));
      await fs.rm(cleanupDir, { recursive: true, force: true });
      throw new InvalidInputError(
        `No SKILL.md found at repo root. Found skills in: ${relativeList.join(", ")}. Specify one in Subdir.`
      );
    }
  }

  await fs.rm(cleanupDir, { recursive: true, force: true });
  throw new InvalidInputError(
    `No SKILL.md found in cloned repo${subdir ? ` at subdir ${subdir}` : ""}. Pass --subdir to the skill folder.`
  );
}

/** Shallow-clone `repo`, list every directory holding a SKILL.md (repo-relative), then clean up. */
export async function discoverGitSkillDirs(repo: string): Promise<string[]> {
  const cleanupDir = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skill-scan-"));

  try {
    await execFileAsync("git", ["clone", "--depth", "1", "--", repo, cleanupDir], {
      env: gitEnv(),
      timeout: GIT_CLONE_TIMEOUT_MS
    });
  } catch (error) {
    await fs.rm(cleanupDir, { recursive: true, force: true });
    const message = error instanceof Error ? error.message : String(error);
    throw new InvalidInputError(`Failed to clone skill repo ${repo}: ${message}`);
  }

  try {
    const discovered = await findSkillDirsInRepo(cleanupDir);
    return discovered
      .map((dir) => path.relative(cleanupDir, dir).replace(/\\/g, "/"))
      .sort((a, b) => a.localeCompare(b));
  } finally {
    await fs.rm(cleanupDir, { recursive: true, force: true });
  }
}

function isCommitSha(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{40}$/i.test(value));
}

/** Current commit of the remote's HEAD via `git ls-remote`, or null when the output has none. */
export async function fetchRemoteHeadSha(repo: string): Promise<string | null> {
  const { stdout } = await execFileAsync("git", ["ls-remote", "--", repo, "HEAD"], {
    env: gitEnv(),
    timeout: GIT_LS_REMOTE_TIMEOUT_MS
  });
  const lines = stdout.trim().split("\n");
  for (const line of lines) {
    const [sha, ref] = line.trim().split(/\s+/);
    if (ref === "HEAD" && isCommitSha(sha)) {
      return sha;
    }
  }
  const [firstSha] = (lines[0] ?? "").trim().split(/\s+/);
  return isCommitSha(firstSha) ? firstSha : null;
}
