import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  type AssetDetail,
  ConflictError,
  InvalidInputError,
  normalizeSkillName,
  type SkillLockEntry
} from "@chain-hub/contracts";

import { installLockKey, mutateInstallLock } from "./install-lock.js";
import { pathExists } from "./shared.js";
import { getAsset } from "./core.js";

const execFileAsync = promisify(execFile);

export interface InstallAssetInput {
  kind: "agents" | "workflows";
  repo?: string;
  path?: string;
  subdir?: string;
  name: string;
  force?: boolean;
  catalogId?: string;
  catalogEntryId?: string;
}

async function cloneRepo(repo: string): Promise<{ cleanupDir: string; commitSha: string | null }> {
  const cleanupDir = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-asset-clone-"));
  try {
    await execFileAsync("git", ["clone", "--depth", "1", "--", repo, cleanupDir], {
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      timeout: 120_000
    });
  } catch (error) {
    await fs.rm(cleanupDir, { recursive: true, force: true });
    throw new InvalidInputError(`Failed to clone repo ${repo}: ${error instanceof Error ? error.message : String(error)}`);
  }

  let commitSha: string | null = null;
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: cleanupDir, timeout: 5000 });
    commitSha = stdout.trim() || null;
  } catch {
    commitSha = null;
  }
  return { cleanupDir, commitSha };
}

/** Resolves the single-file asset inside the source tree: explicit .md path, or `<subdir-or-root>/<name>.md`. */
async function locateAssetFile(sourceRoot: string, subdir: string | undefined, name: string): Promise<{ file: string; resolvedSubdir: string | null }> {
  const candidates: Array<{ file: string; subdir: string }> = [];

  if (subdir) {
    const resolved = path.join(sourceRoot, subdir);
    if (subdir.endsWith(".md")) {
      candidates.push({ file: resolved, subdir });
    } else {
      candidates.push({ file: path.join(resolved, `${name}.md`), subdir });
    }
  }
  candidates.push({ file: path.join(sourceRoot, `${name}.md`), subdir: "" });
  candidates.push({ file: path.join(sourceRoot, `${name}`, `${name}.md`), subdir: name });

  for (const candidate of candidates) {
    if (await pathExists(candidate.file)) {
      return { file: candidate.file, resolvedSubdir: candidate.subdir || null };
    }
  }
  throw new InvalidInputError(`No ${name}.md found in source${subdir ? ` at subdir ${subdir}` : ""}`);
}

/**
 * Installs a single-file asset (agents/workflows) from a git repo or local path
 * into `<kind>/<name>.md`, recording provenance in assets-lock.json.
 */
export async function installAssetFromSource(
  chainHome: string,
  input: InstallAssetInput
): Promise<{ asset: AssetDetail; lockEntry: SkillLockEntry }> {
  if (Boolean(input.repo) === Boolean(input.path)) {
    throw new InvalidInputError("Provide exactly one of path or repo");
  }

  const name = normalizeSkillName(input.name);
  if (!name) {
    throw new InvalidInputError("Asset name cannot be empty");
  }

  const destination = path.join(chainHome, input.kind, `${name}.md`);
  if ((await pathExists(destination)) && !input.force) {
    throw new ConflictError(`Asset already exists: ${input.kind}/${name} (pass force to replace)`);
  }

  let cleanupDir: string | null = null;
  let sourceRoot: string;
  let sourceType: SkillLockEntry["sourceType"];
  let source: string;
  let commitSha: string | null = null;

  try {
    if (input.path) {
      sourceRoot = path.resolve(input.path);
      sourceType = "path";
      source = sourceRoot;
    } else {
      const cloned = await cloneRepo(input.repo!);
      cleanupDir = cloned.cleanupDir;
      sourceRoot = cleanupDir;
      commitSha = cloned.commitSha;
      sourceType = "git";
      source = input.repo!;
    }

    const { file, resolvedSubdir } = await locateAssetFile(sourceRoot, input.subdir, name);
    const content = await fs.readFile(file, "utf8");
    const contentHash = createHash("sha1").update(content).digest("hex");

    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content, "utf8");

    const now = new Date().toISOString();
    const lockEntry = await mutateInstallLock(chainHome, (lockFile) => {
      const previous = lockFile.entries[installLockKey(input.kind, name)];
      const entry: SkillLockEntry = {
        sourceType,
        source,
        subdir: resolvedSubdir,
        contentHash,
        commitSha: commitSha ?? previous?.commitSha ?? null,
        latestSha: commitSha ?? null,
        installedAt: previous?.installedAt ?? now,
        updatedAt: now,
        lastCheckedAt: now,
        catalogId: input.catalogId ?? null,
        catalogEntryId: input.catalogEntryId ?? null
      };
      lockFile.entries[installLockKey(input.kind, name)] = entry;
      return entry;
    });

    return { asset: await getAsset(chainHome, input.kind, name), lockEntry };
  } finally {
    if (cleanupDir) {
      await fs.rm(cleanupDir, { recursive: true, force: true });
    }
  }
}
