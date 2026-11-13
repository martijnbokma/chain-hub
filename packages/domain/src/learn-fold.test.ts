import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAsset } from "@chain-hub/storage";

import {
  captureHubEvent,
  createLibraryAsset,
  foldHubLearnings,
  initializeChainHub,
  installLibrarySkill,
  updateHubAiSettings
} from "./index.js";

const originalHome = process.env.HOME;
const originalFetch = globalThis.fetch;
let tmpHome: string;

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-fold-home-"));
  for (const editorRoot of [".claude", ".cursor"]) {
    await fs.mkdir(path.join(tmpHome, editorRoot), { recursive: true });
  }
  process.env.HOME = tmpHome;
});

afterEach(() => {
  process.env.HOME = originalHome;
  globalThis.fetch = originalFetch;
});

async function makeTmpHub(): Promise<string> {
  const hub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-fold-test-"));
  await initializeChainHub(hub);
  await updateHubAiSettings(hub, { provider: "anthropic", anthropicApiKey: "sk-ant-test" });
  return hub;
}

/** Queue Anthropic-shaped responses: audit JSON first, then raw improved content. */
function mockProvider(responses: string[]) {
  const queue = [...responses];
  globalThis.fetch = vi.fn(async () => {
    const text = queue.shift();
    if (text === undefined) {
      throw new Error("mock provider: no queued response");
    }
    return Response.json({ content: [{ type: "text", text }] });
  }) as unknown as typeof fetch;
}

const AUDIT_WITH_FINDINGS = JSON.stringify({
  summary: "Skill misses a guard",
  findings: [{ severity: "high", title: "Add guard", detail: "Say to grep the declared class name first.", source: "learning" }]
});
const AUDIT_CLEAN = JSON.stringify({ summary: "Meets the bar", findings: [] });
const IMPROVED = "---\nname: fold-skill\ndescription: Improved skill\n---\n\n# Fold Skill\n\nImproved body.";

async function hubWithSkillAndReport(hub: string, name = "fold-skill"): Promise<void> {
  await createLibraryAsset(hub, {
    kind: "skills",
    name,
    content: `---\nname: ${name}\ndescription: Test skill\n---\n\n# ${name}\n\nBody.`
  });
  await captureHubEvent(hub, { type: "failure", skill: name, summary: "Grep the declared class name first" });
}

function resolvedMarkers(hub: string): Promise<Record<string, string>> {
  return fs
    .readFile(path.join(hub, "memory", "learnings", "resolved.json"), "utf8")
    .then((raw) => JSON.parse(raw) as Record<string, string>)
    .catch(() => ({}));
}

describe("foldHubLearnings", () => {
  it("applies audit findings into an editable skill, writes an artifact and resolves reports", async () => {
    const hub = await makeTmpHub();
    await hubWithSkillAndReport(hub);
    mockProvider([AUDIT_WITH_FINDINGS, IMPROVED]);

    const result = await foldHubLearnings(hub, {});

    expect(result.results).toHaveLength(1);
    const item = result.results[0]!;
    expect(item.outcome).toBe("applied");
    expect(item.findingCount).toBe(1);
    expect(item.findings[0]?.source).toBe("learning");
    expect(item.proposedContent).toContain("Improved body.");
    expect(item.currentContent).toContain("Body.");
    expect(item.learningsConsidered).toBe(1);
    expect(item.artifactPath).toContain(path.join("folds"));

    const skill = await getAsset(hub, "skills", "fold-skill");
    expect(skill.content).toContain("Improved body.");

    const markers = await resolvedMarkers(hub);
    expect(markers["fold-skill"]).toBeTruthy();

    const artifact = await fs.readFile(item.artifactPath!, "utf8");
    expect(artifact).toContain("## Findings applied (1)");
    expect(artifact).toContain("Grep the declared class name first");
    expect(artifact).toContain("Improved body.");
  });

  it("resolves reports without touching the skill when the audit returns no findings", async () => {
    const hub = await makeTmpHub();
    await hubWithSkillAndReport(hub);
    mockProvider([AUDIT_CLEAN]);

    const result = await foldHubLearnings(hub, {});

    expect(result.results[0]!.outcome).toBe("reviewed-clean");
    expect((await getAsset(hub, "skills", "fold-skill")).content).toContain("Body.");
    expect((await resolvedMarkers(hub))["fold-skill"]).toBeTruthy();
  });

  it("marks slugs without a hub skill as orphans and leaves reports open", async () => {
    const hub = await makeTmpHub();
    await captureHubEvent(hub, { type: "failure", skill: "ghost-skill", summary: "not a real skill" });

    const result = await foldHubLearnings(hub, {});

    expect(result.results[0]!.outcome).toBe("orphan");
    expect(await resolvedMarkers(hub)).not.toHaveProperty("ghost-skill");
  });

  it("dry-run reports would-be outcomes without writing anything", async () => {
    const hub = await makeTmpHub();
    await hubWithSkillAndReport(hub);
    mockProvider([AUDIT_WITH_FINDINGS, IMPROVED]);

    const result = await foldHubLearnings(hub, { dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.results[0]!.outcome).toBe("applied");
    expect(result.results[0]!.proposedContent).toContain("Improved body.");
    expect((await getAsset(hub, "skills", "fold-skill")).content).toContain("Body.");
    expect(await resolvedMarkers(hub)).toEqual({});
    await expect(fs.stat(path.join(hub, "memory", "learnings", "folds"))).rejects.toThrow();
  });

  it("records findings-only and resolves reports when the asset is too large to rewrite", async () => {
    const hub = await makeTmpHub();
    const oversized = "x".repeat(20_000);
    await createLibraryAsset(hub, {
      kind: "skills",
      name: "huge-skill",
      content: `---\nname: huge-skill\ndescription: Oversized\n---\n\n${oversized}`
    });
    await captureHubEvent(hub, { type: "correction", skill: "huge-skill", summary: "Still useful guidance" });
    mockProvider([AUDIT_WITH_FINDINGS]); // improve throws before reaching the provider

    const result = await foldHubLearnings(hub, { skill: "huge-skill" });

    const item = result.results[0]!;
    expect(item.outcome).toBe("findings-only");
    expect(item.error).toContain("12,000");
    expect(item.artifactPath).toContain("folds");
    expect((await getAsset(hub, "skills", "huge-skill")).content).toContain(oversized);
    expect(await resolvedMarkers(hub)).toHaveProperty("huge-skill");
  });

  it("writes a contribution artifact for upstream-locked skills instead of editing them", async () => {
    const hub = await makeTmpHub();
    const source = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-fold-src-"));
    const skillDir = path.join(source, "locked-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      "---\nname: locked-skill\ndescription: Upstream skill\n---\n\n# Locked\n\nOriginal.",
      "utf8"
    );
    await installLibrarySkill(hub, { path: skillDir });
    await captureHubEvent(hub, { type: "correction", skill: "locked-skill", summary: "Should warn about X" });
    mockProvider([AUDIT_WITH_FINDINGS, IMPROVED]);

    const result = await foldHubLearnings(hub, {});

    const item = result.results[0]!;
    expect(item.outcome).toBe("upstream-proposal");
    const artifact = await fs.readFile(item.artifactPath!, "utf8");
    expect(artifact).toContain("## Provenance");
    expect(artifact).toContain("sourceType: path");

    // Neither the installed copy nor the source changed.
    expect((await getAsset(hub, "skills", "locked-skill")).content).toContain("Original.");
    expect(await fs.readFile(path.join(skillDir, "SKILL.md"), "utf8")).toContain("Original.");
    expect((await resolvedMarkers(hub))["locked-skill"]).toBeTruthy();
  });

  it("with toSource writes the improvement back into the path source", async () => {
    const hub = await makeTmpHub();
    const source = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-fold-src-"));
    const skillDir = path.join(source, "vault-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      "---\nname: vault-skill\ndescription: Path-sourced skill\n---\n\n# Vault\n\nOriginal.",
      "utf8"
    );
    await installLibrarySkill(hub, { path: skillDir });
    await captureHubEvent(hub, { type: "note", skill: "vault-skill", summary: "Mention exec bits on scripts" });
    mockProvider([AUDIT_WITH_FINDINGS, IMPROVED]);

    const result = await foldHubLearnings(hub, { toSource: true });

    expect(result.results[0]!.outcome).toBe("to-source");
    expect(await fs.readFile(path.join(skillDir, "SKILL.md"), "utf8")).toContain("Improved body.");
    // The installed copy stays as installed — `chain skill update` refreshes it from source.
    expect((await getAsset(hub, "skills", "vault-skill")).content).toContain("Original.");
    expect((await resolvedMarkers(hub))["vault-skill"]).toBeTruthy();
  });

  it("capture flags unknown slugs", async () => {
    const hub = await makeTmpHub();
    await createLibraryAsset(hub, { kind: "skills", name: "real-skill", content: "# Real\n\nBody." });

    const known = await captureHubEvent(hub, { type: "note", skill: "real-skill", summary: "x" });
    const unknown = await captureHubEvent(hub, { type: "note", skill: "not-real", summary: "x" });

    expect(known.knownSkill).toBe(true);
    expect(unknown.knownSkill).toBe(false);
  });
});
