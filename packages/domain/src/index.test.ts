import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getAsset } from "@chain-hub/storage";

import {
  captureHubEvent,
  createLibraryAsset,
  deleteLibraryAsset,
  getDashboardOverview,
  getHubAgentsSkillsDrift,
  getHubLearningsTimeline,
  getHubReflectionReport,
  getLibrary,
  getLibraryAsset,
  initializeChainHub,
  installLibrarySkill,
  syncAgentsSkillsIntoHub,
  updateLibraryAsset,
  validateChainHub,
  writeHubReflection
} from "./index.js";

const execFileAsync = promisify(execFile);

async function makeTmpHub(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-domain-test-"));
}

// Asset CRUD now syncs to editor adapters, which write under os.homedir().
// Point HOME at a throwaway dir for every test in this file so we never touch
// the real developer machine's ~/.claude, ~/.cursor, etc.
const originalHome = process.env.HOME;
let tmpHome: string;

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-domain-home-"));
  process.env.HOME = tmpHome;
});

afterEach(() => {
  process.env.HOME = originalHome;
});

describe("initializeChainHub", () => {
  it("returns isFirstRun=true on first call", async () => {
    const hub = await makeTmpHub();
    const result = await initializeChainHub(hub);
    expect(result.isFirstRun).toBe(true);
    expect(result.chainHome).toBe(hub);
    expect(result.message).toContain(hub);
  });

  it("returns isFirstRun=false on subsequent calls", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);
    const result = await initializeChainHub(hub);
    expect(result.isFirstRun).toBe(false);
  });
});

describe("getDashboardOverview", () => {
  it("returns a valid overview shape after init", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);
    const overview = await getDashboardOverview(hub);
    expect(overview.chainHome).toBe(hub);
    expect(typeof overview.assetCounts).toBe("object");
    expect(typeof overview.health).toBe("object");
    expect(typeof overview.storage).toBe("object");
    expect(overview.agentsSkillsDrift).toMatchObject({
      missingCount: 0,
      missingNames: []
    });
  });
});

describe("syncAgentsSkillsIntoHub", () => {
  it("imports a new agents lock skill and clears drift", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);

    const repo = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-sync-repo-"));
    const skillDir = path.join(repo, "synced-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      "---\nname: synced-skill\ndescription: Sync fixture\n---\n\n# synced-skill\n",
      "utf8"
    );
    await execFileAsync("git", ["init"], { cwd: repo });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
    await execFileAsync("git", ["add", "."], { cwd: repo });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: repo });

    const lockPath = path.join(repo, "agents-skill-lock.json");
    await fs.writeFile(
      lockPath,
      JSON.stringify(
        {
          version: 3,
          skills: {
            "synced-skill": {
              sourceType: "github",
              sourceUrl: repo,
              skillPath: "synced-skill/SKILL.md"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const before = await getHubAgentsSkillsDrift(hub, lockPath);
    expect(before.missingCount).toBe(1);

    const result = await syncAgentsSkillsIntoHub(hub, { lockPath });
    expect(result.results[0]?.status).toBe("migrated");
    expect(await getAsset(hub, "skills", "synced-skill")).toMatchObject({ name: "synced-skill" });

    const after = await getHubAgentsSkillsDrift(hub, lockPath);
    expect(after.missingCount).toBe(0);
  });

  it("returns empty results when agents lock is missing", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);
    const missingLock = path.join(hub, "no-such-agents-lock.json");
    const result = await syncAgentsSkillsIntoHub(hub, { lockPath: missingLock });
    expect(result.results).toEqual([]);
  });
});

describe("validateChainHub", () => {
  it("passes on a fresh hub", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);
    const result = await validateChainHub(hub);
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

describe("library asset CRUD via domain", () => {
  it("creates, reads, updates, and deletes an asset", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);

    const created = await createLibraryAsset(hub, {
      kind: "skills",
      name: "test-skill",
      content: "# Test Skill\n\nInitial content."
    });
    expect(created.name).toBe("test-skill");
    expect(created.kind).toBe("skills");

    const fetched = await getLibraryAsset(hub, "skills", "test-skill");
    expect(fetched.content).toContain("Initial content");

    const list = await getLibrary(hub);
    expect(list.some((a) => a.name === "test-skill")).toBe(true);

    await deleteLibraryAsset(hub, "skills", "test-skill");
    const listAfter = await getLibrary(hub, "skills");
    expect(listAfter.some((a) => a.name === "test-skill")).toBe(false);
  });

  it("syncs skill/agent/rule assets to Claude Code's native paths on create/update/delete", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);

    await createLibraryAsset(hub, { kind: "skills", name: "sync-skill", content: "# Sync Skill\n\nBody." });
    const skillPath = path.join(tmpHome, ".claude", "skills", "sync-skill", "SKILL.md");
    expect((await fs.readFile(skillPath, "utf8"))).toContain("description: Sync Skill");

    await updateLibraryAsset(hub, "skills", "sync-skill", "# Sync Skill\n\nUpdated body.");
    expect((await fs.readFile(skillPath, "utf8"))).toContain("Updated body.");

    await deleteLibraryAsset(hub, "skills", "sync-skill");
    await expect(fs.stat(skillPath)).rejects.toThrow();
  });

  it("installs a skill from path into the hub and projects SKILL.md + sidecars to Claude and Cursor", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);

    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-domain-skill-"));
    const source = path.join(fixtureRoot, "install-skill");
    await fs.mkdir(path.join(source, "scripts"), { recursive: true });
    await fs.writeFile(
      path.join(source, "SKILL.md"),
      "---\nname: install-skill\ndescription: Installed skill\n---\n\n# Install Skill\n\nBody.\n",
      "utf8"
    );
    await fs.writeFile(path.join(source, "scripts", "run.sh"), "#!/bin/sh\necho run\n", "utf8");

    const result = await installLibrarySkill(hub, { path: source });
    expect(result.asset.name).toBe("install-skill");

    const claudeSkill = path.join(tmpHome, ".claude", "skills", "install-skill");
    const cursorSkill = path.join(tmpHome, ".cursor", "skills", "install-skill");
    expect(await fs.readFile(path.join(claudeSkill, "SKILL.md"), "utf8")).toContain("chain_hub_source");
    expect(await fs.readFile(path.join(claudeSkill, "scripts", "run.sh"), "utf8")).toContain("echo run");
    expect(await fs.readFile(path.join(cursorSkill, "SKILL.md"), "utf8")).toContain("Installed skill");
    expect(await fs.readFile(path.join(cursorSkill, "scripts", "run.sh"), "utf8")).toContain("echo run");
  });
});

describe("learnings via domain", () => {
  it("captures events and retrieves timeline", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);

    await captureHubEvent(hub, { type: "success", skill: "domain-skill", summary: "Domain test passed" });
    await captureHubEvent(hub, { type: "note", skill: "domain-skill", summary: "A note" });

    const timeline = await getHubLearningsTimeline(hub);
    expect(timeline.totalEvents).toBe(2);
    expect(timeline.status).toBe("active");
  });

  it("builds a reflection report with correct skill grouping", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);

    await captureHubEvent(hub, { type: "success", skill: "alpha", summary: "win" });
    await captureHubEvent(hub, { type: "failure", skill: "beta", summary: "loss" });
    await captureHubEvent(hub, { type: "correction", skill: "beta", summary: "fix" });

    const report = await getHubReflectionReport(hub);
    expect(report.totalSkills).toBe(2);
    const alpha = report.skills.find((s) => s.skill === "alpha");
    expect(alpha?.trend).toBe("new");
    const beta = report.skills.find((s) => s.skill === "beta");
    expect(beta?.trend).toBe("struggling");
  });

  it("writes reflection markdown to memory/reflections/", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);
    await captureHubEvent(hub, { type: "note", skill: "any", summary: "test" });

    const result = await writeHubReflection(hub);
    expect(result.filePath).toContain("reflections");
    expect(result.content).toContain("# Reflection");
    const stat = await fs.stat(result.filePath);
    expect(stat.isFile()).toBe(true);
  });
});
