import { describe, expect, it } from "vitest";

import { analysisReportSchema, saveAnalysisInputSchema, updateAnalysisItemInputSchema } from "./analysis.js";
import {
  assertSafeRelativeSkillPath,
  hasSkillUpdate,
  normalizeSkillName,
  resolveSkillUpstreamBrowseUrl,
  subdirFromSkillPath
} from "./asset.js";
import { ConflictError, NotFoundError } from "./errors.js";
import {
  catalogIndexSchema,
  catalogResultSchema,
  catalogSourcesFileSchema,
  installCatalogEntryInputSchema
} from "./catalog.js";

const entry = {
  id: "systematic-debugging",
  kind: "skills",
  name: "Systematic debugging",
  description: "Four-phase root-cause debugging.",
  source: { repo: "https://github.com/obra/superpowers", subdir: "skills/systematic-debugging" }
};

describe("catalog schemas", () => {
  it("parses an index and applies entry defaults", () => {
    const index = catalogIndexSchema.parse({
      version: 1,
      catalog: { id: "chain-hub", name: "Chain Hub Catalog" },
      entries: [entry]
    });
    expect(index.entries[0]).toMatchObject({ category: "other", tags: [], hasScripts: false });
  });

  it("rejects non-kebab ids and unknown categories", () => {
    expect(() => catalogIndexSchema.parse({ version: 1, catalog: { id: "c", name: "C" }, entries: [{ ...entry, id: "Bad Id" }] })).toThrow();
    expect(() =>
      catalogIndexSchema.parse({ version: 1, catalog: { id: "c", name: "C" }, entries: [{ ...entry, category: "games" }] })
    ).toThrow();
  });

  it("parses sources, results with failures, and install input", () => {
    expect(
      catalogSourcesFileSchema.parse({
        version: 1,
        sources: [{ id: "chain-hub", url: "https://example.com/catalog.json", addedAt: "2026-01-01T00:00:00Z" }]
      }).sources[0]?.autoRefresh
    ).toBe(true);
    const result = catalogResultSchema.parse({
      entries: [{ ...entry, sourceId: "chain-hub", installed: false }],
      stale: true,
      failures: [{ sourceId: "chain-hub", error: "Catalog index fetch failed (404)" }],
      checkedAt: "2026-01-01T00:00:00Z"
    });
    expect(result.failures).toHaveLength(1);
    expect(() => installCatalogEntryInputSchema.parse({ sourceId: "", entryId: "x" })).toThrow();
  });
});

describe("analysis schemas", () => {
  it("parses a report, save input defaults and status updates", () => {
    const report = analysisReportSchema.parse({
      version: 1,
      runAt: "2026-01-01T00:00:00Z",
      totalAssets: 1,
      items: [{ id: "skills/a/compat-issue", kind: "skills", name: "a", type: "compat-issue", status: "open", contentHash: "abc" }]
    });
    expect(report.items[0]?.status).toBe("open");
    const input = saveAnalysisInputSchema.parse({
      totalAssets: 1,
      entries: [{ kind: "skills", name: "a", classification: null, classifyError: null, audit: null, auditError: null }]
    });
    expect(input.entries[0]?.compatIssues).toEqual([]);
    expect(() => updateAnalysisItemInputSchema.parse({ id: "x", status: "archived" })).toThrow();
  });
});

describe("hub errors", () => {
  it("carry the HTTP status of their class", () => {
    expect(new NotFoundError("missing")).toMatchObject({ status: 404, name: "NotFoundError" });
    expect(new ConflictError("taken")).toMatchObject({ status: 409, name: "ConflictError" });
  });
});

describe("skill lock helpers", () => {
  const lock = {
    sourceType: "git" as const,
    source: "https://github.com/a/b",
    subdir: null,
    installedAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z"
  };

  it("flags an update only when the remote sha differs from the locked one", () => {
    expect(hasSkillUpdate(null)).toBe(false);
    expect(hasSkillUpdate({ ...lock, commitSha: "a", latestSha: "a" })).toBe(false);
    expect(hasSkillUpdate({ ...lock, commitSha: "a", latestSha: "b" })).toBe(true);
  });

  it("normalizes names, subdirs and safe paths", () => {
    expect(normalizeSkillName("  My Skill! ")).toBe("my-skill");
    expect(subdirFromSkillPath("skills/a/SKILL.md")).toBe("skills/a");
    expect(subdirFromSkillPath("SKILL.md")).toBeUndefined();
    expect(subdirFromSkillPath(undefined)).toBeUndefined();
    expect(assertSafeRelativeSkillPath("/refs/a.md")).toBe("refs/a.md");
    expect(() => assertSafeRelativeSkillPath("../secret")).toThrow();
  });

  it("resolves browse URLs for https and ssh git sources", () => {
    expect(resolveSkillUpstreamBrowseUrl(null)).toBeNull();
    expect(resolveSkillUpstreamBrowseUrl({ ...lock, sourceType: "path", source: "/tmp/x" })).toBeNull();
    expect(resolveSkillUpstreamBrowseUrl({ ...lock, source: "git@github.com:a/b.git" })).toContain("github.com/a/b");
    expect(resolveSkillUpstreamBrowseUrl({ ...lock, source: "https://github.com/a/b.git", subdir: "skills/x" })).toContain(
      "github.com/a/b"
    );
  });
});
