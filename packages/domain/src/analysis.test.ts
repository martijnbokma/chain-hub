import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createAsset, updateAsset } from "@chain-hub/storage";
import { describe, expect, it } from "vitest";

import { getHubAnalysisReport, saveHubAnalysisReport, updateHubAnalysisItemStatus } from "./analysis.js";

async function makeTmpHub(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-analysis-"));
}

const mismatchEntry = {
  kind: "agents" as const,
  name: "maybe-skill",
  classification: {
    currentKind: "agents" as const,
    recommendedKind: "skills" as const,
    matchesCurrent: false,
    reason: "Reads like a skill"
  },
  classifyError: null,
  audit: {
    summary: "Needs work",
    findings: [{ severity: "high" as const, title: "Vague", detail: "Be concrete" }]
  },
  auditError: null,
  compatIssues: [{ code: "missing_description" as const, severity: "error" as const, message: "Missing description" }]
};

const cleanEntry = {
  kind: "skills" as const,
  name: "fine",
  classification: {
    currentKind: "skills" as const,
    recommendedKind: "skills" as const,
    matchesCurrent: true,
    reason: "OK"
  },
  classifyError: null,
  audit: { summary: "Clean", findings: [] },
  auditError: null,
  compatIssues: []
};

describe("saveHubAnalysisReport", () => {
  it("derives one item per finding type and skips clean assets", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "agents", name: "maybe-skill", content: "# Hi" });
    await createAsset(hub, { kind: "skills", name: "fine", content: "# Fine\n\nDescribed." });

    const report = await saveHubAnalysisReport(hub, {
      totalAssets: 2,
      entries: [mismatchEntry, cleanEntry]
    });

    expect(report.totalAssets).toBe(2);
    expect(report.items.map((item) => item.type).sort()).toEqual([
      "audit-findings",
      "compat-issue",
      "kind-mismatch"
    ]);
    expect(report.items.every((item) => item.status === "open")).toBe(true);
    expect(report.items.every((item) => item.contentHash.length > 0)).toBe(true);

    const persisted = await getHubAnalysisReport(hub);
    expect(persisted?.items).toHaveLength(3);
  });

  it("keeps dismissed items dismissed while content is unchanged, reopens after edits", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "agents", name: "maybe-skill", content: "# Hi" });
    await saveHubAnalysisReport(hub, { totalAssets: 1, entries: [mismatchEntry] });

    const itemId = "agents/maybe-skill/kind-mismatch";
    await updateHubAnalysisItemStatus(hub, { id: itemId, status: "dismissed" });

    const unchanged = await saveHubAnalysisReport(hub, { totalAssets: 1, entries: [mismatchEntry] });
    expect(unchanged.items.find((item) => item.id === itemId)?.status).toBe("dismissed");

    await updateAsset(hub, "agents", "maybe-skill", "# Hi\n\nEdited body.");
    const changed = await saveHubAnalysisReport(hub, { totalAssets: 1, entries: [mismatchEntry] });
    expect(changed.items.find((item) => item.id === itemId)?.status).toBe("open");
  });

  it("drops items that no longer appear in the new run", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "agents", name: "maybe-skill", content: "# Hi" });
    await saveHubAnalysisReport(hub, { totalAssets: 1, entries: [mismatchEntry] });

    const clean = await saveHubAnalysisReport(hub, {
      totalAssets: 1,
      entries: [{ ...mismatchEntry, classification: { ...mismatchEntry.classification, recommendedKind: "agents" as const, matchesCurrent: true }, audit: { summary: "Clean", findings: [] }, compatIssues: [] }]
    });
    expect(clean.items).toHaveLength(0);
  });
});

describe("updateHubAnalysisItemStatus", () => {
  it("sets the status and persists the report", async () => {
    const hub = await makeTmpHub();
    await createAsset(hub, { kind: "agents", name: "maybe-skill", content: "# Hi" });
    await saveHubAnalysisReport(hub, { totalAssets: 1, entries: [mismatchEntry] });

    const report = await updateHubAnalysisItemStatus(hub, {
      id: "agents/maybe-skill/audit-findings",
      status: "done"
    });
    expect(report.items.find((item) => item.type === "audit-findings")?.status).toBe("done");
  });
});
