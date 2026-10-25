import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { InvalidInputError } from "@chain-hub/contracts";

// GitHub REST access for sync: repo lookup/creation via native fetch (Node ≥22),
// plus `gh` CLI reuse when it's installed — no new runtime dependencies.

const execFileAsync = promisify(execFile);

const GITHUB_API = "https://api.github.com";
const GITHUB_TIMEOUT_MS = 20_000;

export type GitHubRepo = {
  fullName: string;
  private: boolean;
  cloneUrl: string;
  defaultBranch: string;
};

type RepoPayload = {
  full_name?: string;
  private?: boolean;
  clone_url?: string;
  default_branch?: string;
};

function toRepo(payload: RepoPayload): GitHubRepo {
  return {
    fullName: payload.full_name ?? "",
    private: payload.private === true,
    cloneUrl: payload.clone_url ?? "",
    defaultBranch: payload.default_branch ?? ""
  };
}

async function githubFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    ...init,
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(init?.headers ?? {})
    }
  });
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

/** GitHub login for the token's owner — also validates the token early. */
export async function getUser(token: string): Promise<{ login: string }> {
  const response = await githubFetch(token, "/user");
  if (!response.ok) {
    const detail = await readError(response);
    throw new InvalidInputError(
      response.status === 401
        ? "GitHub token is invalid or expired — check your PAT or run `gh auth login`"
        : `GitHub user lookup failed: ${detail}`
    );
  }
  const body = (await response.json()) as { login?: string };
  if (!body.login) throw new InvalidInputError("GitHub user lookup returned no login");
  return { login: body.login };
}

export async function getRepo(token: string, ownerRepo: string): Promise<GitHubRepo | null> {
  const response = await githubFetch(token, `/repos/${ownerRepo}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new InvalidInputError(`GitHub repo lookup failed: ${await readError(response)}`);
  }
  return toRepo((await response.json()) as RepoPayload);
}

/** Create a private repo owned by the token's user. */
export async function createPrivateRepo(token: string, name: string): Promise<GitHubRepo> {
  const response = await githubFetch(token, "/user/repos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      private: true,
      description: "Chain Hub sync — skills, agents, workflows, rules and prompts",
      has_issues: false,
      has_wiki: false,
      has_projects: false
    })
  });
  if (!response.ok) {
    throw new InvalidInputError(`Could not create repo "${name}": ${await readError(response)}`);
  }
  return toRepo((await response.json()) as RepoPayload);
}

/** Repos created via the API use the account default branch — flip it to main after the first push. */
export async function setDefaultBranch(token: string, ownerRepo: string, branch: string): Promise<void> {
  await githubFetch(token, `/repos/${ownerRepo}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ default_branch: branch })
  });
}

/** True when the repo carries our sync manifest (chain-hub.json at root). */
export async function hasSyncManifest(token: string, ownerRepo: string): Promise<boolean> {
  const response = await githubFetch(token, `/repos/${ownerRepo}/contents/chain-hub.json`);
  if (response.status === 404) return false;
  if (!response.ok) return false;
  return true;
}

// --- `gh` CLI reuse -------------------------------------------------------

async function tryExec(command: string, args: string[], timeout = 15_000): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(command, args, { timeout });
    return stdout;
  } catch {
    return null;
  }
}

/**
 * The token `gh` already stores in the OS keychain — printed to stdout and
 * auto-refreshed near expiry. Null when gh is missing or not authenticated.
 */
export async function ghAuthToken(): Promise<string | null> {
  const out = await tryExec("gh", ["auth", "token"]);
  const token = out?.trim();
  return token ? token : null;
}

/** Registers `gh` as git's credential helper so `git push/pull` just works. */
export async function ghSetupGit(): Promise<void> {
  await tryExec("gh", ["auth", "setup-git"]);
}
