import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  mutateSkillsLock,
  removeSkillLockEntry,
  renameSkillLockEntry,
  readSkillsLock,
  skillDir,
  skillFile,
  unlinkSkill
} from "./skills-lock.js";
import { mutateInstallLock } from "./install-lock.js";

async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-skills-lock-"));
}

async function seedEntry(chainHome: string, name: string): Promise<void> {
  await mutateSkillsLock(chainHome, (lock) => {
    lock.skills[name] = {
      sourceType: "git",
      source: "https://example.com/repo.git",
      subdir: null,
      installedAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
      lastCheckError: null,
      lastUpdateError: null,
      unlinkedAt: null,
      unlinkedReason: null
    };
  });
}

describe("skills-lock", () => {
  it("round-trips a skill lock entry", async () => {
    const dir = await makeTmpDir();
    await seedEntry(dir, "demo");
    const lock = await readSkillsLock(dir);
    expect(lock.skills.demo?.source).toBe("https://example.com/repo.git");
  });

  it("ignores non-skill entries in the lock", async () => {
    const dir = await makeTmpDir();
    await mutateInstallLock(dir, (lock) => {
      lock.entries["rules/style"] = {
        sourceType: "path",
        source: "/x",
        subdir: null,
        installedAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
        lastCheckError: null,
        lastUpdateError: null,
        unlinkedAt: null,
        unlinkedReason: null
      };
    });
    expect((await readSkillsLock(dir)).skills.style).toBeUndefined();
  });

  it("renames and removes entries", async () => {
    const dir = await makeTmpDir();
    await seedEntry(dir, "old");
    await renameSkillLockEntry(dir, "old", "new");
    expect((await readSkillsLock(dir)).skills.old).toBeUndefined();
    expect((await readSkillsLock(dir)).skills.new?.sourceType).toBe("git");
    await removeSkillLockEntry(dir, "new");
    expect((await readSkillsLock(dir)).skills.new).toBeUndefined();
  });

  it("unlinkSkill marks the entry unlinked", async () => {
    const dir = await makeTmpDir();
    await seedEntry(dir, "gone");
    await fs.mkdir(skillDir(dir, "gone"), { recursive: true });
    await unlinkSkill(dir, "gone", "source-missing");
    const entry = (await readSkillsLock(dir)).skills.gone;
    expect(entry?.unlinkedAt).toBeTruthy();
    expect(entry?.unlinkedReason).toBe("source-missing");
    expect(entry?.source).toBe("https://example.com/repo.git");
  });

  it("exposes stable path helpers", () => {
    expect(skillDir("/h", "a b")).toBe(path.join("/h", "skills", "a b"));
    expect(skillFile("/h", "s")).toBe(path.join("/h", "skills", "s", "SKILL.md"));
  });
});
