import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { forkLibrarySkill, installLibrarySkill, summarizeAgentsSkillSync, updateLibrarySkills } from "./skills.js";

// Editor projection writes under process.env.HOME; keep every test in a throwaway home.
const originalHome = process.env.HOME;
let tmpHome: string;

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-domain-skills-home-"));
  process.env.HOME = tmpHome;
  // Only installed editors are synced; Claude Code counts as installed once ~/.claude exists.
  await fs.mkdir(path.join(tmpHome, ".claude"), { recursive: true });
});

afterEach(() => {
  process.env.HOME = originalHome;
});

async function writeSkillSource(name: string, body: string): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-domain-skill-src-"));
  const dir = path.join(root, name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: Test skill.\n---\n\n${body}\n`, "utf8");
  return dir;
}

function projectedSkill(name: string): string {
  return path.join(tmpHome, ".claude", "skills", name, "SKILL.md");
}

describe("summarizeAgentsSkillSync", () => {
  it("counts migrated, skipped and failed items", () => {
    expect(
      summarizeAgentsSkillSync({ results: [{ status: "migrated" }, { status: "skipped" }, { status: "skipped" }, { status: "failed" }] })
    ).toBe("Agents skill sync: 1 migrated, 2 skipped, 1 failed");
  });
});

describe("skill use-cases project into installed editors", () => {
  it("installs, updates and forks with editor sync", async () => {
    const hub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-domain-skills-hub-"));
    const source = await writeSkillSource("demo", "First version.");

    await installLibrarySkill(hub, { path: source });
    expect(await fs.readFile(projectedSkill("demo"), "utf8")).toContain("First version.");

    await fs.writeFile(path.join(source, "SKILL.md"), "---\nname: demo\ndescription: Test skill.\n---\n\nSecond version.\n", "utf8");
    const update = await updateLibrarySkills(hub, { name: "demo" });
    expect(update.results[0]?.status).toBe("updated");
    expect(await fs.readFile(projectedSkill("demo"), "utf8")).toContain("Second version.");

    const unchanged = await updateLibrarySkills(hub, { name: "demo" });
    expect(unchanged.results[0]?.status).toBe("skipped");

    const fork = await forkLibrarySkill(hub, { name: "demo" });
    expect(fork.name).toBe("demo-local");
    expect(await fs.readFile(projectedSkill("demo-local"), "utf8")).toContain("Second version.");
  });
});
