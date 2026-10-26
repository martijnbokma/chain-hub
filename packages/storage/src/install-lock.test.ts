import { mkdtempSync, rmSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CORRUPT_LEGACY_LOCK_PREFIX,
  installLockKey,
  mutateInstallLock,
  readInstallLock,
  removeInstallLockEntry
} from "./install-lock.js";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "install-lock-"));
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const entry = {
  sourceType: "git" as const,
  source: "x/y",
  subdir: null,
  installedAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  commitSha: "abc"
};

describe("readInstallLock", () => {
  it("returns an empty lock when no files exist", async () => {
    expect(await readInstallLock(tmp)).toEqual({ version: 1, entries: {} });
  });

  it("migrates the legacy skills-lock once, keyed skills/<name>", async () => {
    await fs.mkdir(path.join(tmp, "system"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "system", "skills-lock.json"),
      JSON.stringify({ version: 1, skills: { a: entry } })
    );

    const lock = await readInstallLock(tmp);
    expect(lock.entries[installLockKey("skills", "a")]).toEqual(entry);
    // Migration writes the unified file; legacy file stays on disk.
    expect(JSON.parse(await fs.readFile(path.join(tmp, "system", "assets-lock.json"), "utf8")).entries["skills/a"]).toEqual(entry);
    await expect(fs.stat(path.join(tmp, "system", "skills-lock.json"))).resolves.toBeTruthy();
  });

  it("quarantines an unreadable assets-lock instead of blanking it", async () => {
    await fs.mkdir(path.join(tmp, "system"), { recursive: true });
    const lockPath = path.join(tmp, "system", "assets-lock.json");
    await fs.writeFile(lockPath, "{ not json");

    expect(await readInstallLock(tmp)).toEqual({ version: 1, entries: {} });
    await expect(fs.stat(lockPath)).rejects.toThrow();
    const quarantined = (await fs.readdir(path.join(tmp, "system"))).find((f) => f.startsWith("assets-lock.json.corrupt-"));
    expect(quarantined).toBeTruthy();
  });

  it("quarantines a corrupt legacy skills-lock on first access", async () => {
    await fs.mkdir(path.join(tmp, "system"), { recursive: true });
    await fs.writeFile(path.join(tmp, "system", "skills-lock.json"), "{ nope");

    await readInstallLock(tmp);
    const quarantined = (await fs.readdir(path.join(tmp, "system"))).find((f) => f.startsWith(CORRUPT_LEGACY_LOCK_PREFIX));
    expect(quarantined).toBeTruthy();
  });
});

describe("mutateInstallLock / removeInstallLockEntry", () => {
  it("serializes writes so parallel mutators keep each other's entries", async () => {
    await Promise.all([
      mutateInstallLock(tmp, (l) => { l.entries["skills/one"] = entry; }),
      mutateInstallLock(tmp, (l) => { l.entries["rules/two"] = entry; }),
      mutateInstallLock(tmp, (l) => { l.entries["skills/three"] = entry; })
    ]);

    const lock = await readInstallLock(tmp);
    expect(Object.keys(lock.entries).sort()).toEqual(["rules/two", "skills/one", "skills/three"]);
  });

  it("removes an existing entry and is a no-op for a missing one", async () => {
    await mutateInstallLock(tmp, (l) => { l.entries["skills/a"] = entry; });
    await removeInstallLockEntry(tmp, "skills", "a");
    expect((await readInstallLock(tmp)).entries["skills/a"]).toBeUndefined();

    const before = await fs.readFile(path.join(tmp, "system", "assets-lock.json"), "utf8");
    await removeInstallLockEntry(tmp, "skills", "missing");
    expect(await fs.readFile(path.join(tmp, "system", "assets-lock.json"), "utf8")).toBe(before);
  });
});
