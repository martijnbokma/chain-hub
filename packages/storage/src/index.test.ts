import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AssetKind } from "@chain-hub/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildReflectionReport,
  captureEvent,
  createAsset,
  convertAssetKind,
  deleteAsset,
  discoverAssets,
  getAsset,
  getIntegrations,
  getLearningsTimeline,
  getSkillLearnings,
  importDiscoveredAsset,
  initializeHub,
  listAssets,
  renameAsset,
  setupIntegrations,
  syncAssetToEditors,
  assertSafeAssetKind,
  assertSafeAssetName
} from "./index.js";

async function makeTmpHub(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-test-"));
  return dir;
}

// setupIntegrations/getIntegrations write under the resolved home dir (process.env.HOME,
// see resolveHomeDir) — point it at a throwaway dir for every test in this file so we
// never touch the real developer machine's ~/.claude, ~/.cursor, etc.
const originalHome = process.env.HOME;
let tmpHome: string;

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-storage-home-"));
  process.env.HOME = tmpHome;
});

afterEach(() => {
  process.env.HOME = originalHome;
});

describe("initializeHub", () => {
  it("returns isFirstRun=true on first call", async () => {
    const hub = await makeTmpHub();
    const result = await initializeHub(hub);
    expect(result.isFirstRun).toBe(true);
    expect(result.chainHome).toBe(hub);
  });

  it("returns isFirstRun=false on subsequent calls", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);
    const result = await initializeHub(hub);
    expect(result.isFirstRun).toBe(false);
  });

  it("creates core directories", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);
    for (const dir of ["skills", "agents", "workflows", "rules", "memory", "system", "logs"]) {
      const stat = await fs.stat(path.join(hub, dir));
      expect(stat.isDirectory()).toBe(true);
    }
  });

  it("seeds welcome on first run only and does not recreate it after delete", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);

    const afterInit = await listAssets(hub, "skills");
    expect(afterInit.some((asset) => asset.name === "welcome")).toBe(true);

    await deleteAsset(hub, "skills", "welcome");
    const afterDelete = await listAssets(hub, "skills");
    expect(afterDelete.some((asset) => asset.name === "welcome")).toBe(false);
  });

  it("seeds a learnings rule that prioritises corrections over routine successes", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);

    const rule = await fs.readFile(path.join(hub, "rules", "chain-hub-learnings.md"), "utf8");
    expect(rule).toContain("chain capture --event <failure|correction|note|success>");
    expect(rule).toContain("Skip routine work");
  });

  it("keeps a user-edited learnings rule on re-init", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);
    const rulePath = path.join(hub, "rules", "chain-hub-learnings.md");
    await fs.writeFile(rulePath, "# Custom rule", "utf8");

    await initializeHub(hub);

    expect(await fs.readFile(rulePath, "utf8")).toBe("# Custom rule");
  });
});

describe("getLearningsTimeline", () => {
  it("returns empty timeline when no log file exists", async () => {
    const hub = await makeTmpHub();
    const result = await getLearningsTimeline(hub);
    expect(result.status).toBe("empty");
    expect(result.totalEvents).toBe(0);
    expect(result.events).toHaveLength(0);
    expect(result.skippedLines).toBe(0);
  });

  it("returns events sorted newest-first", async () => {
    const hub = await makeTmpHub();
    await captureEvent(hub, { type: "note", skill: "alpha", summary: "first" });
    await captureEvent(hub, { type: "success", skill: "beta", summary: "second" });
    const result = await getLearningsTimeline(hub);
    expect(result.totalEvents).toBe(2);
    expect(result.events[0].skill).toBe("beta");
    expect(result.events[1].skill).toBe("alpha");
  });

  it("counts skippedLines for malformed JSONL", async () => {
    const hub = await makeTmpHub();
    await captureEvent(hub, { type: "note", skill: "x", summary: "ok" });
    const logPath = path.join(hub, "memory", "learnings", "events.jsonl");
    await fs.appendFile(logPath, "NOT_JSON\n", "utf8");
    const result = await getLearningsTimeline(hub);
    expect(result.totalEvents).toBe(1);
    expect(result.skippedLines).toBe(1);
  });

  it("paginates with limit and offset", async () => {
    const hub = await makeTmpHub();
    for (let i = 0; i < 5; i++) {
      await captureEvent(hub, { type: "note", skill: `skill-${i}`, summary: `event ${i}` });
    }
    const page0 = await getLearningsTimeline(hub, 2, 0);
    const page1 = await getLearningsTimeline(hub, 2, 2);
    expect(page0.returnedEvents).toBe(2);
    expect(page0.offset).toBe(0);
    expect(page1.returnedEvents).toBe(2);
    expect(page1.offset).toBe(2);
    const allIds = new Set([...page0.events.map((e) => e.id), ...page1.events.map((e) => e.id)]);
    expect(allIds.size).toBe(4);
  });
});

describe("captureEvent", () => {
  it("appends event and returns it with id and capturedAt", async () => {
    const hub = await makeTmpHub();
    const event = await captureEvent(hub, { type: "success", skill: "react", summary: "It works" });
    expect(event.id).toBeTruthy();
    expect(event.type).toBe("success");
    expect(event.skill).toBe("react");
    expect(event.summary).toBe("It works");
    expect(event.capturedAt).toBeTruthy();
  });

  it("persists event to JSONL file", async () => {
    const hub = await makeTmpHub();
    await captureEvent(hub, { type: "correction", skill: "api", summary: "fixed route" });
    const logPath = path.join(hub, "memory", "learnings", "events.jsonl");
    const raw = await fs.readFile(logPath, "utf8");
    const parsed = JSON.parse(raw.trim());
    expect(parsed.skill).toBe("api");
  });
});

async function writeEvents(
  hub: string,
  events: Array<{ type: string; skill: string; summary: string; capturedAt: string }>
): Promise<void> {
  const logPath = path.join(hub, "memory", "learnings", "events.jsonl");
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  const lines = events.map((event, index) => JSON.stringify({ id: `e${index}`, ...event }));
  await fs.writeFile(logPath, lines.join("\n") + "\n", "utf8");
}

describe("buildReflectionReport", () => {
  it("returns empty report when no events", async () => {
    const hub = await makeTmpHub();
    const report = await buildReflectionReport(hub);
    expect(report.totalEvents).toBe(0);
    expect(report.totalSkills).toBe(0);
    expect(report.skills).toHaveLength(0);
  });

  it("groups events by skill and computes trend", async () => {
    const hub = await makeTmpHub();
    await captureEvent(hub, { type: "success", skill: "react", summary: "a" });
    await captureEvent(hub, { type: "success", skill: "react", summary: "b" });
    await captureEvent(hub, { type: "failure", skill: "api", summary: "c" });
    await captureEvent(hub, { type: "correction", skill: "api", summary: "d" });
    const report = await buildReflectionReport(hub);
    expect(report.totalSkills).toBe(2);
    const reactSkill = report.skills.find((s) => s.skill === "react");
    expect(reactSkill?.trend).toBe("improving");
    expect(reactSkill?.successCount).toBe(2);
    const apiSkill = report.skills.find((s) => s.skill === "api");
    expect(apiSkill?.trend).toBe("struggling");
    expect(apiSkill?.failureCount).toBe(1);
    expect(apiSkill?.correctionCount).toBe(1);
  });

  it("marks single-event skills as new", async () => {
    const hub = await makeTmpHub();
    await captureEvent(hub, { type: "note", skill: "brand-new", summary: "first event" });
    const report = await buildReflectionReport(hub);
    expect(report.skills[0].trend).toBe("new");
  });

  it("counts every event, not only the first timeline page", async () => {
    const hub = await makeTmpHub();
    const events = Array.from({ length: 150 }, (_, index) => ({
      type: "success",
      skill: "bulk",
      summary: `event ${index}`,
      capturedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString()
    }));
    await writeEvents(hub, events);

    const report = await buildReflectionReport(hub);

    expect(report.totalEvents).toBe(150);
    expect(report.skills[0].totalEvents).toBe(150);
  });
});

describe("getSkillLearnings", () => {
  it("returns only corrections, failures and notes for the requested skill, newest first", async () => {
    const hub = await makeTmpHub();
    await writeEvents(hub, [
      { type: "correction", skill: "api", summary: "old correction", capturedAt: "2026-01-01T00:00:00.000Z" },
      { type: "success", skill: "api", summary: "routine", capturedAt: "2026-01-02T00:00:00.000Z" },
      { type: "note", skill: "other", summary: "other skill", capturedAt: "2026-01-03T00:00:00.000Z" },
      { type: "failure", skill: "api", summary: "new failure", capturedAt: "2026-01-04T00:00:00.000Z" }
    ]);

    const learnings = await getSkillLearnings(hub, "api");

    expect(learnings.map((event) => event.summary)).toEqual(["new failure", "old correction"]);
  });

  it("caps results at the limit", async () => {
    const hub = await makeTmpHub();
    await writeEvents(
      hub,
      Array.from({ length: 5 }, (_, index) => ({
        type: "note",
        skill: "api",
        summary: `note ${index}`,
        capturedAt: new Date(Date.UTC(2026, 0, 1 + index)).toISOString()
      }))
    );

    const learnings = await getSkillLearnings(hub, "api", 2);

    expect(learnings.map((event) => event.summary)).toEqual(["note 4", "note 3"]);
  });

  it("returns an empty list when no log exists", async () => {
    const hub = await makeTmpHub();
    expect(await getSkillLearnings(hub, "api")).toEqual([]);
  });
});

describe("renameAsset", () => {
  it("renames a markdown asset file and updates the index", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);
    await createAsset(hub, {
      kind: "workflows",
      name: "old-audit-name",
      content: "# Project Audit\n\nBody."
    });

    const renamed = await renameAsset(hub, "workflows", "old-audit-name", "project-audit");
    expect(renamed.name).toBe("project-audit");
    expect(renamed.relativePath).toBe("workflows/project-audit.md");

    const listed = await listAssets(hub, "workflows");
    expect(listed.map((asset) => asset.name)).toEqual(["project-audit"]);
  });
});

describe("convertAssetKind", () => {
  it("moves a prompt to skills and removes the old file", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);
    await createAsset(hub, {
      kind: "prompts",
      name: "review-pr",
      content: "---\nname: review-pr\ndescription: Review PRs\n---\n\n# Review\n\nSteps."
    });

    const converted = await convertAssetKind(hub, "prompts", "review-pr", "skills");
    expect(converted.kind).toBe("skills");
    expect(converted.name).toBe("review-pr");
    expect(converted.relativePath).toBe("skills/review-pr/SKILL.md");

    const prompts = await listAssets(hub, "prompts");
    expect(prompts.map((asset) => asset.name)).not.toContain("review-pr");
    const skills = await listAssets(hub, "skills");
    expect(skills.some((asset) => asset.name === "review-pr")).toBe(true);
  });
});

describe("setupIntegrations", () => {
  it("replaces a legacy whole-folder symlink with adapter-managed native files", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);
    await createAsset(hub, { kind: "skills", name: "demo", content: "# Demo\n\nBody." });

    const legacySymlinkPath = path.join(tmpHome, ".claude", "chain-hub");
    await fs.mkdir(path.dirname(legacySymlinkPath), { recursive: true });
    await fs.symlink(hub, legacySymlinkPath, "dir");

    await setupIntegrations(hub);

    await expect(fs.lstat(legacySymlinkPath)).rejects.toThrow();
    const managedSkill = await fs.readFile(path.join(tmpHome, ".claude", "skills", "demo", "SKILL.md"), "utf8");
    expect(managedSkill).toContain("chain_hub_source: skills/demo");
  });

  it("reports managed mode with correct supported/unsupported kinds via getIntegrations", async () => {
    const hub = await makeTmpHub();
    await setupIntegrations(hub);

    const integrations = await getIntegrations(hub);
    const claudeCode = integrations.find((integration) => integration.id === "claude-code");
    expect(claudeCode?.mode).toBe("managed");
    expect(claudeCode?.supportedKinds).toEqual(["skills", "agents", "rules"]);
    expect(claudeCode?.unsupportedKinds).toEqual(["workflows", "prompts"]);
  });

  it("claims unmarked editor twins when hub already owns the skill name", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);
    await createAsset(hub, {
      kind: "skills",
      name: "with-sidecar",
      content: "# With sidecar\n\nBody."
    });

    const agentsSkillDir = path.join(tmpHome, ".agents", "skills", "with-sidecar");
    const claudeSkillLink = path.join(tmpHome, ".claude", "skills", "with-sidecar");
    await fs.mkdir(path.dirname(claudeSkillLink), { recursive: true });
    await fs.mkdir(agentsSkillDir, { recursive: true });
    await fs.writeFile(path.join(agentsSkillDir, "SKILL.md"), "legacy unmanaged skill", "utf8");
    await fs.symlink(agentsSkillDir, claudeSkillLink, "dir");

    const sidecarDir = path.join(hub, "skills", "with-sidecar", "assets");
    await fs.mkdir(sidecarDir, { recursive: true });
    await fs.writeFile(path.join(sidecarDir, "helper.txt"), "sidecar payload", "utf8");

    await setupIntegrations(hub);

    const skillMd = await fs.readFile(path.join(agentsSkillDir, "SKILL.md"), "utf8");
    expect(skillMd).toContain("chain_hub_source: skills/with-sidecar");
    expect(skillMd).toContain("Body.");

    const copied = await fs.readFile(path.join(agentsSkillDir, "assets", "helper.txt"), "utf8");
    expect(copied).toBe("sidecar payload");
  });
});

describe("discoverAssets + importDiscoveredAsset", () => {
  it("discovers a hand-written native file and reports it with editor context", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);

    const filePath = path.join(tmpHome, ".claude", "skills", "hand-written", "SKILL.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "---\nname: hand-written\ndescription: A hand-written skill\n---\n\nBody text.", "utf8");

    const discovered = await discoverAssets(hub);

    expect(discovered).toHaveLength(1);
    expect(discovered[0]).toMatchObject({ editorId: "claude-code", kind: "skills", name: "hand-written" });
  });

  it("hides editor-native skills that already exist in the hub by kind/name", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);
    await createAsset(hub, { kind: "skills", name: "already-hub", content: "# Hub\n\nBody." });

    const twinPath = path.join(tmpHome, ".agents", "skills", "already-hub", "SKILL.md");
    await fs.mkdir(path.dirname(twinPath), { recursive: true });
    await fs.writeFile(
      twinPath,
      "---\nname: already-hub\ndescription: Unmanaged twin\n---\n\nEditor copy.",
      "utf8"
    );

    const onlyEditorPath = path.join(tmpHome, ".agents", "skills", "only-editor", "SKILL.md");
    await fs.mkdir(path.dirname(onlyEditorPath), { recursive: true });
    await fs.writeFile(
      onlyEditorPath,
      "---\nname: only-editor\ndescription: Fresh skill\n---\n\nBody.",
      "utf8"
    );

    const discovered = await discoverAssets(hub);

    expect(discovered.some((candidate) => candidate.name === "already-hub")).toBe(false);
    expect(discovered.some((candidate) => candidate.name === "only-editor")).toBe(true);
  });

  it("claims an unmarked twin on sync so it is no longer foreign", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);
    const asset = await createAsset(hub, { kind: "skills", name: "twin", content: "# Twin\n\nHub body." });

    const twinPath = path.join(tmpHome, ".agents", "skills", "twin", "SKILL.md");
    await fs.mkdir(path.dirname(twinPath), { recursive: true });
    await fs.writeFile(twinPath, "unmanaged editor copy", "utf8");

    await syncAssetToEditors(hub, "skills", "twin", asset);

    const claimed = await fs.readFile(twinPath, "utf8");
    expect(claimed).toContain("chain_hub_source: skills/twin");
    expect(claimed).toContain("Hub body.");
    expect((await discoverAssets(hub)).some((candidate) => candidate.name === "twin")).toBe(false);
  });

  it("imports a discovered asset into the hub, after which it's no longer discoverable", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);

    const filePath = path.join(tmpHome, ".claude", "rules", "hand-written.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "Always write tests first.", "utf8");

    const imported = await importDiscoveredAsset(hub, { editorId: "claude-code", kind: "rules", name: "hand-written" });
    expect(imported.content).toBe("Always write tests first.");

    const assets = await listAssets(hub, "rules");
    expect(assets.some((asset) => asset.name === "hand-written")).toBe(true);

    // Importing alone doesn't rewrite the source file — that only happens once the
    // regular sync path (syncAssetToEditors) runs, adopting it everywhere.
    await syncAssetToEditors(hub, "rules", "hand-written", imported);
    const rewritten = await fs.readFile(filePath, "utf8");
    expect(rewritten).toContain("chain_hub_source: rules/hand-written");

    const discoveredAfter = await discoverAssets(hub);
    expect(discoveredAfter.some((candidate) => candidate.name === "hand-written")).toBe(false);
  });

  it("imports a skill without losing frontmatter or sidecar files, and backs up the original", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);

    const skillDir = path.join(tmpHome, ".claude", "skills", "pdf-tool");
    const original = "---\nname: pdf-tool\ndescription: Work with PDFs\nallowed-tools:\n  - Bash\nlicense: MIT\n---\n\n# PDF\n";
    await fs.mkdir(path.join(skillDir, "scripts"), { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), original, "utf8");
    await fs.writeFile(path.join(skillDir, "scripts", "run.sh"), "echo hi\n", "utf8");

    const imported = await importDiscoveredAsset(hub, { editorId: "claude-code", kind: "skills", name: "pdf-tool" });

    expect(imported.content).toBe(original);
    expect(await fs.readFile(path.join(hub, "skills", "pdf-tool", "scripts", "run.sh"), "utf8")).toBe("echo hi\n");

    const rewritten = await fs.readFile(path.join(skillDir, "SKILL.md"), "utf8");
    expect(rewritten).toContain("chain_hub_source: skills/pdf-tool");
    expect(rewritten).toContain("description: Work with PDFs");
    expect(rewritten).toContain("- Bash");

    const day = new Date().toISOString().slice(0, 10);
    const backup = path.join(hub, "backups", day, ".claude", "skills", "pdf-tool", "SKILL.md");
    expect(await fs.readFile(backup, "utf8")).toBe(original);
  });

  it("throws when the requested candidate no longer exists", async () => {
    const hub = await makeTmpHub();
    await initializeHub(hub);

    await expect(importDiscoveredAsset(hub, { editorId: "claude-code", kind: "rules", name: "missing" })).rejects.toThrow(
      /No importable/
    );
  });
});

describe("Path containment and assertSafeAssetName", () => {
  it("rejects path traversal attempts and invalid names", async () => {
    expect(() => assertSafeAssetName("../escaped")).toThrow(/traversal/i);
    expect(() => assertSafeAssetName("foo/bar")).toThrow(/traversal/i);
    expect(() => assertSafeAssetName("foo\\bar")).toThrow(/traversal/i);
    expect(() => assertSafeAssetName("")).toThrow(/empty/i);
    expect(assertSafeAssetName("valid-name_123")).toBe("valid-name_123");

    const hub = await makeTmpHub();
    await initializeHub(hub);

    await expect(getAsset(hub, "skills", "../../etc/passwd")).rejects.toThrow(/traversal/i);
    await expect(deleteAsset(hub, "skills", "../escaped")).rejects.toThrow(/traversal/i);
  });

  it("rejects unknown asset kinds before resolving a path", async () => {
    expect(() => assertSafeAssetKind("..")).toThrow(/invalid asset kind/i);
    expect(() => assertSafeAssetKind("secrets")).toThrow(/invalid asset kind/i);
    expect(assertSafeAssetKind("rules")).toBe("rules");

    const hub = await makeTmpHub();
    await initializeHub(hub);

    // Cast mimics an unvalidated route param reaching storage.
    await expect(getAsset(hub, ".." as AssetKind, "passwd")).rejects.toThrow(/invalid asset kind/i);
  });
});


