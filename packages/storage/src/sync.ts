import { promises as fs } from "node:fs";
import os from "node:os";

import {
  ConflictError,
  InvalidInputError,
  type ResolveConflictsInput,
  type SyncConnectInput,
  type SyncStatus
} from "@chain-hub/contracts";

import { updateAiSecrets } from "./ai-settings.js";
import { initializeHub, resolveChainHome } from "./core.js";
import {
  createPrivateRepo,
  getRepo,
  getUser,
  ghAuthToken,
  ghSetupGit,
  hasSyncManifest,
  setDefaultBranch
} from "./github.js";
import { pathExists } from "./shared.js";
import {
  addPath,
  aheadBehind,
  cloneRepo,
  commitAll,
  dirtyCount,
  ensureIdentity,
  ensureMainBranch,
  fetchOrigin,
  finishMerge,
  hasCommits,
  headSha,
  initRepo,
  isGitAvailable,
  isGitRepo,
  mergeInProgress,
  pullMerge,
  pullRebase,
  push,
  rebaseAbort,
  remoteBranchExists,
  removeRemote,
  resolvePath,
  setRemote,
  stageAll,
  stagedPaths,
  SYNC_BRANCH,
  trackedFiles,
  unmergedPaths
} from "./sync-git.js";
import {
  assertNoDenied,
  DEFAULT_REPO_NAME,
  ensureSyncFiles,
  readSyncConfig,
  readSyncState,
  resolveSyncToken,
  safeRelativeGitPath,
  writeSyncConfig,
  writeSyncState
} from "./sync-state.js";

// Orchestrates GitHub-backed sync of the hub folder. The hub stays the live
// store; the private remote is a replica. Config/state I/O and path guards
// live in sync-state.ts. Layout and rationale:
// notes/docs/specs/hub-cloud-backup-sync.md.
export async function syncNow(chainHomeInput?: string): Promise<SyncStatus> {
  const chainHome = resolveChainHome(chainHomeInput);
  const config = await readSyncConfig(chainHome);
  if (!config.enabled || !config.remote) {
    throw new InvalidInputError("Sync is not connected — run `chain sync connect` first");
  }
  if (!(await isGitRepo(chainHome))) {
    throw new InvalidInputError("The hub folder is not a git repo — run `chain sync connect` to set it up");
  }
  if (await mergeInProgress(chainHome)) {
    throw new ConflictError("A merge is in progress — resolve conflicts first (`chain sync resolve`)");
  }

  const state = await readSyncState(chainHome);
  const token = await resolveSyncToken(chainHome, state.authMethod);

  await ensureIdentity(chainHome);
  await ensureSyncFiles(chainHome);
  await stageAll(chainHome);
  assertNoDenied(await stagedPaths(chainHome));
  if ((await stagedPaths(chainHome)).length > 0) {
    await commitAll(chainHome, `sync: ${os.hostname()} ${new Date().toISOString()}`);
  }

  await fetchOrigin(chainHome, token);
  const { behind } = await aheadBehind(chainHome);
  if (behind > 0) {
    const rebase = await pullRebase(chainHome, token);
    if (!rebase.ok) {
      if (!rebase.conflict) {
        throw new InvalidInputError(`Sync pull failed: ${rebase.stderr.trim() || "unknown git error"}`);
      }
      // Convert to a plain merge so resolution works on normal working-tree files.
      await rebaseAbort(chainHome);
      const merge = await pullMerge(chainHome, token);
      if (merge.conflict) {
        const files = await unmergedPaths(chainHome);
        await writeSyncState(chainHome, {
          ...state,
          pendingConflict: { startedAt: new Date().toISOString(), files },
          lastSyncError: `Merge conflict in ${files.length} file(s) — resolve via dashboard or \`chain sync resolve\``
        });
        return getSyncStatus(chainHome);
      }
      if (!merge.ok) {
        throw new InvalidInputError(`Sync pull failed: ${merge.stderr.trim() || "unknown git error"}`);
      }
    }
  }

  // Pre-push scan: nothing denylisted may be tracked, even if .gitignore changed.
  assertNoDenied(await trackedFiles(chainHome));
  await push(chainHome, token);
  await writeSyncState(chainHome, {
    ...state,
    pendingConflict: null,
    lastSyncAt: new Date().toISOString(),
    lastSyncSha: await headSha(chainHome),
    lastSyncError: null
  });
  return getSyncStatus(chainHome);
}

/** Connect the hub to a private GitHub repo — creating it when needed. */
export async function connectSync(chainHomeInput: string | undefined, input: SyncConnectInput): Promise<SyncStatus> {
  const chainHome = resolveChainHome(chainHomeInput);
  if (!(await isGitAvailable())) {
    throw new InvalidInputError("Sync requires git — install git first");
  }

  let token: string | undefined;
  if (input.method === "gh") {
    token = (await ghAuthToken()) ?? undefined;
    if (!token) {
      throw new InvalidInputError("`gh` is not authenticated — run `gh auth login` or connect with method \"pat\"");
    }
    await ghSetupGit();
  } else {
    token = input.token?.trim();
    if (!token) {
      throw new InvalidInputError(
        "A fine-grained PAT is required — needs Contents: read/write (+ Administration: write to create the repo)"
      );
    }
  }

  const { login } = await getUser(token);
  const repoName = input.repo ?? DEFAULT_REPO_NAME;
  const ownerRepo = `${login}/${repoName}`;

  let repo = await getRepo(token, ownerRepo);
  let created = false;
  if (repo) {
    if (!repo.private) {
      throw new InvalidInputError(`Repo ${ownerRepo} is public — Chain Hub sync requires a private repo`);
    }
    if (!(await hasSyncManifest(token, ownerRepo)) && !input.adopt) {
      throw new ConflictError(
        `${ownerRepo} exists but isn't a Chain Hub sync repo — pass adopt: true / --adopt to take it over`
      );
    }
  } else {
    repo = await createPrivateRepo(token, repoName);
    created = true;
  }

  const remoteUrl = repo.cloneUrl;
  const hubHasFiles =
    (await pathExists(chainHome)) && (await fs.readdir(chainHome)).filter((entry) => entry !== ".git").length > 0;

  if (!hubHasFiles) {
    // Fresh machine: clone the remote straight into the hub path, then seed.
    await cloneRepo(remoteUrl, chainHome, token);
    await ensureMainBranch(chainHome);
    await ensureIdentity(chainHome);
  } else {
    await initializeHub(chainHome);
    if (!(await isGitRepo(chainHome))) {
      await initRepo(chainHome);
    }
    await ensureIdentity(chainHome);
    await ensureSyncFiles(chainHome);
    await stageAll(chainHome);
    assertNoDenied(await stagedPaths(chainHome));
    if ((await stagedPaths(chainHome)).length > 0 || !(await hasCommits(chainHome))) {
      await commitAll(chainHome, `chain-hub sync: init ${os.hostname()}`);
    }
    await setRemote(chainHome, remoteUrl);
    await fetchOrigin(chainHome, token);
    let conflictFiles: string[] = [];
    if (await remoteBranchExists(chainHome)) {
      const rebase = await pullRebase(chainHome, token);
      if (rebase.conflict) {
        await rebaseAbort(chainHome);
        const merge = await pullMerge(chainHome, token);
        if (merge.conflict) {
          conflictFiles = await unmergedPaths(chainHome);
        } else if (!merge.ok) {
          throw new InvalidInputError(`Initial pull failed: ${merge.stderr.trim() || "unknown git error"}`);
        }
      } else if (!rebase.ok) {
        throw new InvalidInputError(`Initial pull failed: ${rebase.stderr.trim() || "unknown git error"}`);
      }
    }
    if (conflictFiles.length === 0) {
      assertNoDenied(await trackedFiles(chainHome));
      await push(chainHome, token);
    }
  }

  // Seeds land in the cloned hub too — initializeHub is idempotent.
  await initializeHub(chainHome);

  if (created) {
    await setDefaultBranch(token, ownerRepo, SYNC_BRANCH).catch(() => undefined);
  }

  const conflicts = await unmergedPaths(chainHome);
  await writeSyncConfig(chainHome, {
    version: 1,
    remote: { provider: "github", url: remoteUrl, repo: ownerRepo },
    enabled: true,
    autoSync: input.autoSync ?? true
  });
  const state = await readSyncState(chainHome);
  await writeSyncState(chainHome, {
    ...state,
    machineId: os.hostname(),
    authMethod: input.method,
    pendingConflict: conflicts.length > 0 ? { startedAt: new Date().toISOString(), files: conflicts } : null,
    lastSyncAt: conflicts.length > 0 ? state.lastSyncAt : new Date().toISOString(),
    lastSyncSha: await headSha(chainHome),
    lastSyncError: conflicts.length > 0 ? `Merge conflict in ${conflicts.length} file(s) — resolve to finish connecting` : null
  });
  if (input.method === "pat" && token) {
    await updateAiSecrets(chainHome, { githubSyncToken: token });
  }
  return getSyncStatus(chainHome);
}

/** Remove the remote connection. Local files and .git history stay. */
export async function disconnectSync(chainHomeInput?: string): Promise<SyncStatus> {
  const chainHome = resolveChainHome(chainHomeInput);
  if (await isGitRepo(chainHome)) {
    await removeRemote(chainHome);
  }
  await writeSyncConfig(chainHome, { version: 1, remote: null, enabled: false, autoSync: true });
  const state = await readSyncState(chainHome);
  await writeSyncState(chainHome, { ...state, pendingConflict: null, lastSyncError: null });
  return getSyncStatus(chainHome);
}

/** Apply per-file resolutions, complete the merge, push. "manual" = user edited the file. */
export async function resolveSyncConflicts(
  chainHomeInput: string | undefined,
  input: ResolveConflictsInput
): Promise<SyncStatus> {
  const chainHome = resolveChainHome(chainHomeInput);
  if (!(await mergeInProgress(chainHome))) {
    throw new ConflictError("No merge in progress — nothing to resolve");
  }
  for (const { path: filePath, strategy } of input.resolutions) {
    const rel = safeRelativeGitPath(filePath);
    if (strategy === "manual") {
      await addPath(chainHome, rel);
    } else {
      await resolvePath(chainHome, strategy, rel);
    }
  }
  const remaining = await unmergedPaths(chainHome);
  if (remaining.length > 0) {
    throw new ConflictError(`Still conflicted: ${remaining.join(", ")}`);
  }
  assertNoDenied(await stagedPaths(chainHome));
  await finishMerge(chainHome);

  const state = await readSyncState(chainHome);
  const token = await resolveSyncToken(chainHome, state.authMethod);
  assertNoDenied(await trackedFiles(chainHome));
  await push(chainHome, token);
  await writeSyncState(chainHome, {
    ...state,
    pendingConflict: null,
    lastSyncAt: new Date().toISOString(),
    lastSyncSha: await headSha(chainHome),
    lastSyncError: null
  });
  return getSyncStatus(chainHome);
}

export async function getSyncStatus(chainHomeInput?: string): Promise<SyncStatus> {
  const chainHome = resolveChainHome(chainHomeInput);
  const config = await readSyncConfig(chainHome);
  const state = await readSyncState(chainHome);
  const base: SyncStatus = {
    connected: false,
    enabled: config.enabled,
    autoSync: config.autoSync,
    remote: config.remote,
    authMethod: state.authMethod,
    machineId: state.machineId || os.hostname(),
    lastSyncAt: state.lastSyncAt,
    lastSyncError: state.lastSyncError,
    uncommitted: 0,
    ahead: 0,
    behind: 0,
    conflicts: []
  };
  if (!config.enabled || !config.remote || !(await isGitRepo(chainHome))) {
    return base;
  }
  const [uncommitted, ab, conflictPaths] = await Promise.all([
    dirtyCount(chainHome),
    aheadBehind(chainHome),
    unmergedPaths(chainHome)
  ]);
  return {
    ...base,
    connected: true,
    uncommitted,
    ahead: ab.ahead,
    behind: ab.behind,
    conflicts: conflictPaths.map((filePath) => ({ path: filePath }))
  };
}

/** Persist an auto-sync failure so the dashboard can surface it until the next successful sync. */
async function recordAutoSyncError(chainHomeInput: string | undefined, error: unknown): Promise<void> {
  try {
    const chainHome = resolveChainHome(chainHomeInput);
    const state = await readSyncState(chainHome);
    await writeSyncState(chainHome, {
      ...state,
      lastSyncError: `Auto-sync failed: ${error instanceof Error ? error.message : String(error)}`
    });
  } catch {
    // A failing state write must not mask the original sync problem.
  }
}

/** Background sync for `chain hub` start — only when enabled, never throws. */
export async function autoSyncOnStart(chainHomeInput?: string): Promise<void> {
  try {
    const config = await readSyncConfig(chainHomeInput);
    if (!config.enabled || !config.autoSync || !config.remote) return;
    const chainHome = resolveChainHome(chainHomeInput);
    if (await mergeInProgress(chainHome)) return;
    await syncNow(chainHome);
  } catch (error) {
    console.warn(`[chain-hub] background sync skipped:`, error instanceof Error ? error.message : error);
    await recordAutoSyncError(chainHomeInput, error);
  }
}

/** Periodic background sync — runs only when the hub drifted from the remote, never throws. */
export async function autoSyncIfDirty(chainHomeInput?: string): Promise<void> {
  try {
    const config = await readSyncConfig(chainHomeInput);
    if (!config.enabled || !config.autoSync || !config.remote) return;
    const chainHome = resolveChainHome(chainHomeInput);
    if (await mergeInProgress(chainHome)) return;
    const status = await getSyncStatus(chainHome);
    if (status.uncommitted + status.ahead + status.behind === 0) return;
    await syncNow(chainHome);
  } catch (error) {
    console.warn(`[chain-hub] periodic sync skipped:`, error instanceof Error ? error.message : error);
    await recordAutoSyncError(chainHomeInput, error);
  }
}
