import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readAnalysisReport, writeAnalysisReport } from "./analysis.js";
import { installAssetFromSource } from "./asset-install.js";
import { installCatalogEntry, refreshCatalogIndexes } from "./catalog.js";
import { CORRUPT_ASSETS_LOCK_PREFIX, CORRUPT_LEGACY_LOCK_PREFIX, readInstallLock } from "./install-lock.js";

const execFileAsync = promisify(execFile);

let hub: string;
let source: string;

const agent = "---\nname: code-reviewer\ndescription: Reviews diffs.\n---\n\nReview the change.\n";

beforeEach(async () => {
  hub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-asset-install-hub-"));
  source = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-asset-install-src-"));
  await fs.mkdir(path.join(source, "plugins", "review", "agents"), { recursive: true });
  await fs.writeFile(path.join(source, "plugins", "review", "agents", "code-reviewer.md"), agent);
  await fs.writeFile(path.join(source, "ship.md"), "---\ndescription: Ship it.\n---\n\nShip.\n");
});

afterEach(async () => {
  await fs.rm(hub, { recursive: true, force: true });
  await fs.rm(source, { recursive: true, force: true });
});

describe("installAssetFromSource", () => {
  it("installs an explicit .md path from a local source and records provenance", async () => {
    const { asset, lockEntry } = await installAssetFromSource(hub, {
      kind: "agents",
      path: source,
      subdir: "plugins/review/agents/code-reviewer.md",
      name: "code-reviewer",
      catalogId: "chain-hub",
      catalogEntryId: "code-reviewer"
    });

    expect(await fs.readFile(path.join(hub, "agents", "code-reviewer.md"), "utf8")).toBe(agent);
    expect(asset.name).toBe("code-reviewer");
    expect(lockEntry).toMatchObject({ sourceType: "path", subdir: "plugins/review/agents/code-reviewer.md", catalogId: "chain-hub" });
    const lock = await readInstallLock(hub);
    expect(lock.entries["agents/code-reviewer"]?.catalogEntryId).toBe("code-reviewer");
  });

  it("clones a git repo and finds <name>.md at the root", async () => {
    await execFileAsync("git", ["init", "-q"], { cwd: source });
    await execFileAsync("git", ["-c", "user.email=t@example.com", "-c", "user.name=t", "add", "."], { cwd: source });
    await execFileAsync("git", ["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-q", "-m", "init"], { cwd: source });

    const { lockEntry } = await installAssetFromSource(hub, { kind: "workflows", repo: source, name: "ship" });

    expect(await fs.readFile(path.join(hub, "workflows", "ship.md"), "utf8")).toContain("Ship.");
    expect(lockEntry.sourceType).toBe("git");
    expect(lockEntry.subdir).toBeNull();
    expect(lockEntry.commitSha).toMatch(/^[0-9a-f]{40}$/);
  });

  it("rejects ambiguous input, existing assets without force, missing files and bad repos", async () => {
    await expect(installAssetFromSource(hub, { kind: "agents", name: "x" })).rejects.toThrow(/exactly one/);
    await expect(installAssetFromSource(hub, { kind: "agents", path: source, name: "!!!" })).rejects.toThrow(/empty/);

    await installAssetFromSource(hub, { kind: "workflows", path: source, name: "ship" });
    await expect(installAssetFromSource(hub, { kind: "workflows", path: source, name: "ship" })).rejects.toThrow(/already exists/);
    await expect(installAssetFromSource(hub, { kind: "workflows", path: source, name: "ship", force: true })).resolves.toBeDefined();

    await expect(installAssetFromSource(hub, { kind: "agents", path: source, subdir: "plugins", name: "missing" })).rejects.toThrow(
      /No missing\.md found in source at subdir plugins/
    );
    await expect(
      installAssetFromSource(hub, { kind: "agents", repo: path.join(source, "does-not-exist"), name: "code-reviewer" })
    ).rejects.toThrow(/Failed to clone/);
  });
});

describe("catalog installs of single-file assets", () => {
  it("installs a catalog agent from its git source with catalog provenance", async () => {
    await execFileAsync("git", ["init", "-q"], { cwd: source });
    await execFileAsync("git", ["add", "."], { cwd: source });
    await execFileAsync("git", ["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-q", "-m", "init"], { cwd: source });
    const indexPath = path.join(hub, "index.json");
    await fs.writeFile(
      indexPath,
      JSON.stringify({
        version: 1,
        catalog: { id: "fixture", name: "Fixture" },
        entries: [
          {
            id: "code-reviewer",
            kind: "agents",
            name: "Code reviewer",
            description: "Reviews diffs.",
            source: { repo: source, subdir: "plugins/review/agents/code-reviewer.md" }
          }
        ]
      })
    );
    await fs.mkdir(path.join(hub, "system"), { recursive: true });
    await fs.writeFile(
      path.join(hub, "system", "catalogs.json"),
      JSON.stringify({ version: 1, sources: [{ id: "fixture", url: indexPath, autoRefresh: true, addedAt: "2026-01-01T00:00:00Z" }] })
    );

    await refreshCatalogIndexes(hub, { force: true });
    const result = await installCatalogEntry(hub, { sourceId: "fixture", entryId: "code-reviewer" });

    expect(result.scriptsDetected).toBe(false);
    expect((await readInstallLock(hub)).entries["agents/code-reviewer"]).toMatchObject({
      sourceType: "git",
      catalogId: "fixture",
      catalogEntryId: "code-reviewer"
    });
  });
});

describe("install lock recovery", () => {
  it("moves an unreadable assets-lock aside and starts empty", async () => {
    await fs.mkdir(path.join(hub, "system"), { recursive: true });
    await fs.writeFile(path.join(hub, "system", "assets-lock.json"), "{not json");

    expect((await readInstallLock(hub)).entries).toEqual({});
    const files = await fs.readdir(path.join(hub, "system"));
    expect(files.some((file) => file.startsWith(CORRUPT_ASSETS_LOCK_PREFIX))).toBe(true);
  });

  it("sets aside a malformed legacy skills-lock instead of migrating it", async () => {
    await fs.mkdir(path.join(hub, "system"), { recursive: true });
    await fs.writeFile(path.join(hub, "system", "skills-lock.json"), JSON.stringify({ version: 2, skills: [] }));

    expect((await readInstallLock(hub)).entries).toEqual({});
    const files = await fs.readdir(path.join(hub, "system"));
    expect(files.some((file) => file.startsWith(CORRUPT_LEGACY_LOCK_PREFIX))).toBe(true);
  });
});

describe("analysis report storage", () => {
  it("round-trips a report and returns null when absent", async () => {
    expect(await readAnalysisReport(hub)).toBeNull();
    const report = { version: 1 as const, runAt: "2026-01-01T00:00:00Z", totalAssets: 0, items: [] };
    await writeAnalysisReport(hub, report);
    expect(await readAnalysisReport(hub)).toEqual(report);
  });
});
