import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { initializeHub } from "./core.js";
import {
  captureEvent,
  listFoldArtifacts,
  readFoldArtifact,
  writeFoldArtifact,
  writeReflectionMarkdown,
  writeSkillToPathSource
} from "./learnings.js";

async function makeTmpHub(): Promise<string> {
  const hub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-learnings-"));
  await initializeHub(hub);
  return hub;
}

describe("writeReflectionMarkdown", () => {
  it("writes a dated reflection file under memory/reflections", async () => {
    const hub = await makeTmpHub();
    await captureEvent(hub, { type: "correction", skill: "pr-review", summary: "Skill should check test coverage" });

    const { filePath, content } = await writeReflectionMarkdown(hub);

    expect(path.dirname(filePath)).toBe(path.join(hub, "memory", "reflections"));
    expect(path.basename(filePath)).toMatch(/^\d{4}-\d{2}-\d{2}\.md$/);
    expect(await fs.readFile(filePath, "utf8")).toBe(content);
    expect(content).toContain("pr-review");
    expect(content).toContain("`[correction]` Skill should check test coverage");
  });

  it("says so when nothing has been captured", async () => {
    const hub = await makeTmpHub();

    const { content } = await writeReflectionMarkdown(hub);

    expect(content).toContain("No events captured yet.");
  });
});

describe("captureEvent", () => {
  it("flags whether the slug names a skill in the hub", async () => {
    const hub = await makeTmpHub();
    await fs.mkdir(path.join(hub, "skills", "real-skill"), { recursive: true });
    await fs.writeFile(path.join(hub, "skills", "real-skill", "SKILL.md"), "# Real\n", "utf8");

    expect((await captureEvent(hub, { type: "note", skill: "real-skill", summary: "x" })).knownSkill).toBe(true);
    expect((await captureEvent(hub, { type: "note", skill: "made-up", summary: "x" })).knownSkill).toBe(false);
  });
});

describe("writeFoldArtifact", () => {
  it("writes a dated fold artifact with findings, reports and before/after", async () => {
    const hub = await makeTmpHub();

    const { filePath, content } = await writeFoldArtifact(hub, {
      skill: "pr-review",
      outcome: "applied",
      auditSummary: "Skill misses a guard",
      findings: [{ severity: "high", title: "Add guard", detail: "Check auth first.", source: "learning" }],
      events: [
        {
          id: "e1",
          type: "failure",
          skill: "pr-review",
          summary: "Grep the declared class name",
          capturedAt: "2026-11-07T10:00:00.000Z"
        }
      ],
      before: "# Old",
      after: "# New",
      writtenTo: "skills/pr-review/SKILL.md"
    });

    expect(path.dirname(path.dirname(filePath))).toBe(path.join(hub, "memory", "learnings", "folds"));
    expect(path.basename(filePath)).toBe("pr-review.md");
    expect(content).toContain("outcome: applied");
    expect(content).toContain("## Findings applied (1)");
    expect(content).toContain("## Field reports folded (1)");
    expect(content).toContain("## Before");
    expect(content).toContain("## After");
  });
});

describe("fold artifact reading", () => {
  it("lists artifacts and reads one back by date + skill", async () => {
    const hub = await makeTmpHub();
    const { filePath } = await writeFoldArtifact(hub, {
      skill: "pr-review",
      outcome: "upstream-proposal",
      auditSummary: "s",
      findings: [],
      events: [],
      before: "# Old",
      after: "# New",
      provenance: {
        sourceType: "git",
        source: "https://github.com/a/b",
        subdir: null,
        installedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    });
    const date = path.basename(path.dirname(filePath));

    const list = await listFoldArtifacts(hub);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ date, skill: "pr-review", outcome: "upstream-proposal" });

    const artifact = await readFoldArtifact(hub, date, "pr-review");
    expect(artifact.content).toContain("## Provenance");
    await expect(readFoldArtifact(hub, date, "../evil")).rejects.toThrow();
    await expect(readFoldArtifact(hub, "2026-13-99", "pr-review")).rejects.toThrow();
  });
});

describe("writeSkillToPathSource", () => {
  it("writes the improved SKILL.md into the source directory", async () => {
    const hub = await makeTmpHub();
    const source = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-fold-source-"));
    await fs.writeFile(path.join(source, "SKILL.md"), "# Original\n", "utf8");

    const { filePath } = await writeSkillToPathSource(
      hub,
      {
        sourceType: "path",
        source,
        subdir: null,
        installedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      },
      "vault-skill",
      "---\nname: vault-skill\ndescription: Better\n---\n\n# Improved"
    );

    expect(filePath).toBe(path.join(source, "SKILL.md"));
    expect(await fs.readFile(filePath, "utf8")).toContain("# Improved");
  });

  it("rejects git-sourced skills", async () => {
    const hub = await makeTmpHub();
    await expect(
      writeSkillToPathSource(
        hub,
        {
          sourceType: "git",
          source: "https://github.com/a/b",
          subdir: "skills/x",
          installedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        },
        "x",
        "# Improved"
      )
    ).rejects.toThrow("not installed from a local path");
  });
});
