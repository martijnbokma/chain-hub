import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  captureHubEvent,
  createHubMemoryNote,
  createLibraryAsset,
  deleteHubMemoryNote,
  deleteLibraryAsset,
  getDashboardOverview,
  getHubLearningsTimeline,
  getHubMemory,
  getHubMemoryNote,
  getHubReflectionReport,
  getLibrary,
  getLibraryAsset,
  initializeChainHub,
  listHubMemoryNotes,
  searchHubMemoryNotes,
  updateLibraryAsset,
  validateChainHub,
  writeHubReflection
} from "./index.js";

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
});

describe("memory notes via domain", () => {
  it("creates, reads, searches, and deletes a note", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);

    const note = await createHubMemoryNote(hub, {
      name: "domain-test-note",
      content: "# Domain Test\n\nSome domain-layer content."
    });
    expect(note.relativePath).toContain("domain-test-note");

    const fetched = await getHubMemoryNote(hub, note.relativePath);
    expect(fetched.content).toContain("domain-layer content");

    const list = await listHubMemoryNotes(hub);
    expect(list.some((n) => n.relativePath === note.relativePath)).toBe(true);

    const results = await searchHubMemoryNotes(hub, "domain-layer");
    expect(results.length).toBeGreaterThan(0);

    await deleteHubMemoryNote(hub, note.relativePath);
    const listAfter = await listHubMemoryNotes(hub);
    expect(listAfter.some((n) => n.relativePath === note.relativePath)).toBe(false);
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

describe("getHubMemory summary", () => {
  it("returns memory summary with path and status", async () => {
    const hub = await makeTmpHub();
    await initializeChainHub(hub);
    const memory = await getHubMemory(hub);
    expect(memory.memoryPath).toContain("memory");
    expect(memory.status).toBe("empty");
    expect(typeof memory.totalFiles).toBe("number");
  });
});
