import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";

import { InvalidInputError } from "@chain-hub/contracts";

// Real execFile has a util.promisify.custom that resolves { stdout, stderr } —
// the mock mirrors that so promisify(execFile) behaves like production.
let ghOutcome: { stdout: string; stderr: string } | Error = { stdout: "", stderr: "" };

vi.mock("node:child_process", () => {
  const execFile = (...args: unknown[]) => {
    const callback = args[args.length - 1] as (error: Error | null, result: unknown) => void;
    if (ghOutcome instanceof Error) {
      callback(ghOutcome, null);
    } else {
      callback(null, ghOutcome);
    }
  };
  return {
    execFile: Object.assign(execFile, {
      [promisify.custom]: () =>
        ghOutcome instanceof Error ? Promise.reject(ghOutcome) : Promise.resolve(ghOutcome)
    })
  };
});

import {
  createPrivateRepo,
  getRepo,
  getUser,
  ghAuthToken,
  ghSetupGit,
  hasSyncManifest,
  setDefaultBranch
} from "./github.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function stubFetch(response: Response | Promise<Response>) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("getUser", () => {
  it("returns the token owner's login", async () => {
    stubFetch(jsonResponse({ login: "tester" }));
    expect(await getUser("tok")).toEqual({ login: "tester" });
  });

  it("explains a 401 as an invalid or expired token", async () => {
    stubFetch(jsonResponse({ message: "Bad credentials" }, 401));
    await expect(getUser("tok")).rejects.toThrow(/invalid or expired/);
  });

  it("surfaces the API message on other failures", async () => {
    stubFetch(jsonResponse({ message: "rate limited" }, 403));
    await expect(getUser("tok")).rejects.toThrow(/rate limited/);
  });

  it("falls back to the HTTP status when the body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 500 })));
    await expect(getUser("tok")).rejects.toThrow(/HTTP 500/);
  });
});

describe("getRepo", () => {
  it("maps the API payload onto GitHubRepo", async () => {
    stubFetch(
      jsonResponse({
        full_name: "me/chain-hub-sync",
        private: true,
        clone_url: "https://github.com/me/chain-hub-sync.git",
        default_branch: "main"
      })
    );
    expect(await getRepo("tok", "me/chain-hub-sync")).toEqual({
      fullName: "me/chain-hub-sync",
      private: true,
      cloneUrl: "https://github.com/me/chain-hub-sync.git",
      defaultBranch: "main"
    });
  });

  it("returns null when the repo does not exist", async () => {
    stubFetch(jsonResponse({ message: "Not Found" }, 404));
    expect(await getRepo("tok", "me/nope")).toBeNull();
  });
});

describe("createPrivateRepo", () => {
  it("posts to /user/repos and maps the created repo", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ full_name: "me/chain-hub-sync", private: true, clone_url: "u", default_branch: "main" })
    );

    const repo = await createPrivateRepo("tok", "chain-hub-sync");

    expect(repo.fullName).toBe("me/chain-hub-sync");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/user/repos",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("wraps API errors in InvalidInputError", async () => {
    stubFetch(jsonResponse({ message: "name already exists" }, 422));
    await expect(createPrivateRepo("tok", "chain-hub-sync")).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("setDefaultBranch", () => {
  it("patches the repo's default_branch", async () => {
    const fetchMock = stubFetch(jsonResponse({}));

    await setDefaultBranch("tok", "me/repo", "main");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ default_branch: "main" });
  });
});

describe("hasSyncManifest", () => {
  it("is true when chain-hub.json exists at the repo root", async () => {
    stubFetch(jsonResponse({ name: "chain-hub.json" }));
    expect(await hasSyncManifest("tok", "me/repo")).toBe(true);
  });

  it("is false on a 404 or any other failure", async () => {
    stubFetch(jsonResponse({ message: "Not Found" }, 404));
    expect(await hasSyncManifest("tok", "me/repo")).toBe(false);
  });
});

describe("gh CLI helpers", () => {
  it("ghAuthToken returns the trimmed token gh prints", async () => {
    ghOutcome = { stdout: "ghp_secret\n", stderr: "" };
    expect(await ghAuthToken()).toBe("ghp_secret");
  });

  it("ghAuthToken returns null when gh is missing or unauthenticated", async () => {
    ghOutcome = new Error("gh not found");
    expect(await ghAuthToken()).toBeNull();
  });

  it("ghAuthToken returns null on empty output", async () => {
    ghOutcome = { stdout: "  \n", stderr: "" };
    expect(await ghAuthToken()).toBeNull();
  });

  it("ghSetupGit resolves without throwing even when gh fails", async () => {
    ghOutcome = new Error("nope");
    await expect(ghSetupGit()).resolves.toBeUndefined();
  });
});
