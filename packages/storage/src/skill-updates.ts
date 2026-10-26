import path from "node:path";

import {
  type CheckSkillUpdatesInput,
  type CheckSkillUpdatesResult,
  hasSkillUpdate,
  isUpstreamOwnedSkill,
  normalizeSkillName,
  NotFoundError,
  type SkillBatchItemResult,
  type SkillCheckItemResult,
  type SkillLockEntry,
  type UpdateSkillsInput,
  type UpdateSkillsResult
} from "@chain-hub/contracts";

import { pathExists } from "./shared.js";
import { fetchRemoteHeadSha } from "./skill-git.js";
import { installSkillFromSourceUnlessUnchanged } from "./skill-install.js";
import {
  clearSkillLockError,
  mutateSkillsLock,
  type ReadAsset,
  readSkillsLock,
  setSkillLockError
} from "./skills-lock.js";

export async function updateSkillsFromLock(
  chainHome: string,
  input: UpdateSkillsInput,
  readAsset: ReadAsset
): Promise<UpdateSkillsResult> {
  const lockFile = await readSkillsLock(chainHome);
  const names = input.name ? [normalizeSkillName(input.name)] : Object.keys(lockFile.skills).sort();
  const results: SkillBatchItemResult[] = [];

  // One ls-remote per repo (in parallel) answers "did the remote move?" far cheaper
  // than the per-skill shallow clone the install path below would otherwise run.
  // A failed probe yields null, which never matches commitSha and falls through to
  // the clone — preserving the existing failure reporting for unreachable remotes.
  const remoteShaByRepo = new Map<string, string | null>();
  if (!input.force) {
    const repos = new Set<string>();
    for (const name of names) {
      const entry = lockFile.skills[name];
      if (entry && isUpstreamOwnedSkill(entry) && entry.sourceType === "git" && entry.commitSha) {
        repos.add(entry.source);
      }
    }
    await Promise.all(
      Array.from(repos).map(async (repo) => {
        try {
          remoteShaByRepo.set(repo, await fetchRemoteHeadSha(repo));
        } catch {
          remoteShaByRepo.set(repo, null);
        }
      })
    );
  }

  for (const name of names) {
    const entry = lockFile.skills[name];

    if (!entry) {
      results.push({ name, status: "failed", error: `No lock entry for ${name}` });
      continue;
    }

    // Uploads are hub-owned, not upstream-owned: there is no source to update from.
    if (!isUpstreamOwnedSkill(entry)) {
      results.push({ name, status: "skipped", previousCommitSha: entry.commitSha ?? null });
      continue;
    }

    // Remote HEAD still sits on the installed commit: upstream cannot have changed.
    if (entry.sourceType === "git" && entry.commitSha && remoteShaByRepo.get(entry.source) === entry.commitSha) {
      await clearSkillLockError(chainHome, name, "lastUpdateError");
      results.push({ name, status: "skipped", previousCommitSha: entry.commitSha, lockEntry: entry });
      continue;
    }

    try {
      if (entry.sourceType === "path" && !(await pathExists(path.join(entry.source, "SKILL.md")))) {
        throw new NotFoundError(`Source path missing SKILL.md: ${entry.source}`);
      }

      const installed = await installSkillFromSourceUnlessUnchanged(
        chainHome,
        {
          path: entry.sourceType === "path" ? entry.source : undefined,
          repo: entry.sourceType === "git" ? entry.source : undefined,
          subdir: entry.subdir ?? undefined,
          name,
          force: true
        },
        readAsset,
        input.force ? null : (entry.contentHash ?? null)
      );

      await clearSkillLockError(chainHome, name, "lastUpdateError");

      results.push({
        name,
        status: installed.unchanged ? "skipped" : "updated",
        previousCommitSha: entry.commitSha ?? null,
        lockEntry: installed.lockEntry
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await setSkillLockError(chainHome, name, "lastUpdateError", message);
      results.push({ name, status: "failed", previousCommitSha: entry.commitSha ?? null, error: message });
    }
  }

  return { results };
}

/** Re-probe remotes at most this often; `force` bypasses the window. */
export const SKILL_UPDATE_CHECK_TTL_MS = 15 * 60 * 1000;

export async function checkSkillUpdatesFromLock(
  chainHome: string,
  input: CheckSkillUpdatesInput = {}
): Promise<CheckSkillUpdatesResult> {
  const lockFile = await readSkillsLock(chainHome);
  const now = new Date().toISOString();
  const freshSince = Date.now() - SKILL_UPDATE_CHECK_TTL_MS;
  const results: SkillCheckItemResult[] = [];
  const targetName = input.name ? normalizeSkillName(input.name) : null;

  const gitReposToSkills = new Map<string, Array<{ name: string; entry: SkillLockEntry }>>();
  const lockUpdates: Array<{
    name: string;
    latestSha?: string;
    lastCheckedAt: string;
    lastCheckError: string | null;
  }> = [];

  for (const [name, entry] of Object.entries(lockFile.skills)) {
    if (targetName && name !== targetName) {
      continue;
    }

    if (!isUpstreamOwnedSkill(entry)) {
      results.push({ name, status: "not_applicable", source: entry.source });
      continue;
    }

    if (entry.sourceType !== "git") {
      // Local path sources are cheap to verify: the folder can move or lose its SKILL.md.
      const sourceOk = await pathExists(path.join(entry.source, "SKILL.md"));
      if (sourceOk) {
        results.push({ name, status: "up_to_date", source: entry.source });
        if (entry.lastCheckError) {
          lockUpdates.push({ name, lastCheckedAt: now, lastCheckError: null });
        }
      } else {
        const error = `Source path missing SKILL.md: ${entry.source}`;
        results.push({ name, status: "failed", source: entry.source, error });
        lockUpdates.push({ name, lastCheckedAt: now, lastCheckError: error });
      }
      continue;
    }

    const checkedAt = entry.lastCheckedAt ? Date.parse(entry.lastCheckedAt) : Number.NaN;
    const fresh = !input.force && Number.isFinite(checkedAt) && checkedAt >= freshSince;
    if (fresh && entry.lastCheckError) {
      results.push({
        name,
        status: "failed",
        source: entry.source,
        currentSha: entry.commitSha ?? null,
        error: entry.lastCheckError
      });
      continue;
    }
    if (fresh && entry.latestSha) {
      results.push({
        name,
        status: hasSkillUpdate(entry) ? "update_available" : "up_to_date",
        source: entry.source,
        currentSha: entry.commitSha ?? null,
        latestSha: entry.latestSha
      });
      continue;
    }

    const list = gitReposToSkills.get(entry.source) ?? [];
    list.push({ name, entry });
    gitReposToSkills.set(entry.source, list);
  }

  const repoRemoteShaMap = new Map<string, { sha?: string; error?: string }>();

  await Promise.all(
    Array.from(gitReposToSkills.keys()).map(async (repo) => {
      try {
        const headSha = await fetchRemoteHeadSha(repo);
        repoRemoteShaMap.set(repo, { sha: headSha ?? undefined });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        repoRemoteShaMap.set(repo, { error: message });
      }
    })
  );

  for (const [repo, skillList] of gitReposToSkills.entries()) {
    const probe = repoRemoteShaMap.get(repo);

    for (const { name, entry } of skillList) {
      if (probe?.error) {
        results.push({
          name,
          status: "failed",
          source: repo,
          currentSha: entry.commitSha ?? null,
          error: probe.error
        });
        lockUpdates.push({ name, lastCheckedAt: now, lastCheckError: probe.error });
        continue;
      }

      const latestSha = probe?.sha;
      if (!latestSha) {
        const error = "Could not resolve remote HEAD commit";
        results.push({
          name,
          status: "failed",
          source: repo,
          currentSha: entry.commitSha ?? null,
          error
        });
        lockUpdates.push({ name, lastCheckedAt: now, lastCheckError: error });
        continue;
      }

      lockUpdates.push({ name, latestSha, lastCheckedAt: now, lastCheckError: null });

      if (entry.commitSha && entry.commitSha === latestSha) {
        results.push({
          name,
          status: "up_to_date",
          source: repo,
          currentSha: entry.commitSha,
          latestSha
        });
      } else {
        results.push({
          name,
          status: "update_available",
          source: repo,
          currentSha: entry.commitSha ?? null,
          latestSha
        });
      }
    }
  }

  if (lockUpdates.length > 0) {
    await mutateSkillsLock(chainHome, (currentLock) => {
      for (const item of lockUpdates) {
        const locked = currentLock.skills[item.name];
        if (locked) {
          locked.lastCheckedAt = item.lastCheckedAt;
          locked.lastCheckError = item.lastCheckError;
          if (item.latestSha) {
            locked.latestSha = item.latestSha;
          }
        }
      }
    }).catch(() => undefined);
  }

  results.sort((a, b) => a.name.localeCompare(b.name));

  return {
    results,
    checkedAt: now
  };
}
