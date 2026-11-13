import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { checkSkillUpdatesFromLock } from "./skill-updates.js";
import { mutateSkillsLock } from "./skills-lock.js";

async function makeHub(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-updates-"));
}

describe("checkSkillUpdatesFromLock", () => {
  it("returns an empty result on a hub with no skills", async () => {
    const dir = await makeHub();
    const result = await checkSkillUpdatesFromLock(dir);
    expect(result.results).toEqual([]);
  });

  it("marks non-upstream skills as not_applicable", async () => {
    const dir = await makeHub();
    await mutateSkillsLock(dir, (lock) => {
      lock.skills.local = {
        sourceType: "path",
        source: "upload://local",
        subdir: null,
        installedAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
        lastCheckError: null,
        lastUpdateError: null,
        unlinkedAt: null,
        unlinkedReason: null
      };
    });
    const result = await checkSkillUpdatesFromLock(dir);
    expect(result.results[0]?.status).toBe("not_applicable");
  });

  it("fails a path-sourced skill whose SKILL.md is missing", async () => {
    const dir = await makeHub();
    const gone = path.join(dir, "ghost-skill");
    await mutateSkillsLock(dir, (lock) => {
      lock.skills.ghost = {
        sourceType: "path",
        source: gone,
        subdir: null,
        installedAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
        lastCheckError: null,
        lastUpdateError: null,
        unlinkedAt: null,
        unlinkedReason: null
      };
    });
    const result = await checkSkillUpdatesFromLock(dir);
    expect(result.results[0]?.status).toBe("failed");
    expect(result.results[0]?.error).toContain("SKILL.md");
  });

  it("passes a path-sourced skill whose SKILL.md exists", async () => {
    const dir = await makeHub();
    const skillDirPath = path.join(dir, "real-skill");
    await fs.mkdir(skillDirPath, { recursive: true });
    await fs.writeFile(path.join(skillDirPath, "SKILL.md"), "# s\n", "utf8");
    await mutateSkillsLock(dir, (lock) => {
      lock.skills.real = {
        sourceType: "path",
        source: skillDirPath,
        subdir: null,
        installedAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
        lastCheckError: null,
        lastUpdateError: null,
        unlinkedAt: null,
        unlinkedReason: null
      };
    });
    const result = await checkSkillUpdatesFromLock(dir);
    expect(result.results[0]?.status).toBe("up_to_date");
  });
});
