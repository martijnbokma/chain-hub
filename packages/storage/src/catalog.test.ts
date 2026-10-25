import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  initializeHub,
  listCatalogEntries,
  mutateInstallLock,
  readCatalogSources,
  readSkillsLock,
  refreshCatalogIndexes,
  resolveCatalogEntry
} from "./index.js";

let tmpHome: string;
let tmpHub: string;
const originalHome = process.env.HOME;

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-catalog-home-"));
  tmpHub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-catalog-hub-"));
  process.env.HOME = tmpHome;
  await initializeHub(tmpHub);
});

afterEach(() => {
  process.env.HOME = originalHome;
});

const FIXTURE_INDEX = {
  version: 1,
  catalog: { id: "fixture", name: "Fixture Catalog" },
  entries: [
    {
      id: "demo-skill",
      kind: "skills",
      name: "Demo skill",
      description: "A fixture skill.",
      author: "tester",
      license: "MIT",
      category: "testing",
      tags: ["demo"],
      source: { repo: "https://github.com/example/skills", subdir: "demo-skill" },
      hasScripts: false
    },
    {
      id: "demo-agent",
      kind: "agents",
      name: "Demo agent",
      description: "A fixture agent.",
      category: "other",
      tags: [],
      source: { repo: "https://github.com/example/agents" },
      hasScripts: false
    }
  ]
};

async function writeFixtureSource(): Promise<string> {
  const indexPath = path.join(tmpHome, "fixture-catalog.json");
  await fs.writeFile(indexPath, JSON.stringify(FIXTURE_INDEX), "utf8");
  await fs.mkdir(path.join(tmpHub, "system"), { recursive: true });
  await fs.writeFile(
    path.join(tmpHub, "system", "catalogs.json"),
    JSON.stringify({
      version: 1,
      sources: [{ id: "fixture", url: indexPath, autoRefresh: true, addedAt: new Date().toISOString() }]
    }),
    "utf8"
  );
  return indexPath;
}

describe("catalog", () => {
  it("seeds the default source when catalogs.json is missing", async () => {
    const sources = await readCatalogSources(tmpHub);
    expect(sources.sources).toHaveLength(1);
    expect(sources.sources[0]?.id).toBe("chain-hub");
    expect(await fs.readFile(path.join(tmpHub, "system", "catalogs.json"), "utf8")).toContain("chain-hub");
  });

  it("fetches, caches and lists entries with install state", async () => {
    await writeFixtureSource();

    const result = await listCatalogEntries(tmpHub, { force: true });
    expect(result.stale).toBe(false);
    expect(result.entries.map((entry) => entry.id).sort()).toEqual(["demo-agent", "demo-skill"]);
    expect(result.entries.every((entry) => !entry.installed)).toBe(true);
    expect(await fs.readFile(path.join(tmpHub, "system", "catalogs", "fixture.json"), "utf8")).toContain("demo-skill");

    // Lock entry for skills/demo-skill flips installed state.
    await mutateInstallLock(tmpHub, (lock) => {
      lock.entries["skills/demo-skill"] = {
        sourceType: "git",
        source: "https://github.com/example/skills",
        subdir: "demo-skill",
        installedAt: "2026-10-24T00:00:00.000Z",
        updatedAt: "2026-10-24T00:00:00.000Z",
        catalogId: "fixture",
        catalogEntryId: "demo-skill"
      };
    });

    const after = await listCatalogEntries(tmpHub);
    expect(after.entries.find((entry) => entry.id === "demo-skill")?.installed).toBe(true);
    expect(after.entries.find((entry) => entry.id === "demo-agent")?.installed).toBe(false);
  });

  it("marks results stale when a source cannot be fetched", async () => {
    await fs.mkdir(path.join(tmpHub, "system"), { recursive: true });
    await fs.writeFile(
      path.join(tmpHub, "system", "catalogs.json"),
      JSON.stringify({
        version: 1,
        sources: [{ id: "broken", url: "https://localhost:1/nope.json", autoRefresh: true, addedAt: "x" }]
      }),
      "utf8"
    );

    const refresh = await refreshCatalogIndexes(tmpHub, { force: true });
    expect(refresh.stale).toBe(true);
    expect(refresh.failed[0]?.sourceId).toBe("broken");

    const listed = await listCatalogEntries(tmpHub);
    expect(listed.stale).toBe(true);
    expect(listed.failures).toEqual([{ sourceId: "broken", error: expect.any(String) }]);
  });

  it("reports a never-fetched source when auto-refresh is off", async () => {
    await fs.mkdir(path.join(tmpHub, "system"), { recursive: true });
    await fs.writeFile(
      path.join(tmpHub, "system", "catalogs.json"),
      JSON.stringify({
        version: 1,
        sources: [{ id: "manual", url: "https://localhost:1/nope.json", autoRefresh: false, addedAt: "x" }]
      }),
      "utf8"
    );

    const listed = await listCatalogEntries(tmpHub);
    expect(listed.failures).toEqual([{ sourceId: "manual", error: "Catalog index has not been fetched yet" }]);
  });

  it("migrates skills-lock.json into assets-lock.json once", async () => {
    await fs.mkdir(path.join(tmpHub, "system"), { recursive: true });
    await fs.writeFile(
      path.join(tmpHub, "system", "skills-lock.json"),
      JSON.stringify({
        version: 1,
        skills: {
          "legacy-skill": {
            sourceType: "git",
            source: "https://github.com/example/legacy",
            subdir: null,
            installedAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          }
        }
      }),
      "utf8"
    );

    const skills = await readSkillsLock(tmpHub);
    expect(skills.skills["legacy-skill"]?.source).toBe("https://github.com/example/legacy");

    const unified = JSON.parse(await fs.readFile(path.join(tmpHub, "system", "assets-lock.json"), "utf8"));
    expect(unified.entries["skills/legacy-skill"]?.sourceType).toBe("git");
  });

  it("resolveCatalogEntry throws for unknown entries", async () => {
    await writeFixtureSource();
    await listCatalogEntries(tmpHub, { force: true });

    await expect(resolveCatalogEntry(tmpHub, "fixture", "demo-skill")).resolves.toMatchObject({ kind: "skills" });
    await expect(resolveCatalogEntry(tmpHub, "fixture", "nope")).rejects.toThrow("Catalog entry not found");
  });
});
