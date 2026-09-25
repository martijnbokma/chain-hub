import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { initializeHub } from "./core.js";
import { captureEvent, writeReflectionMarkdown } from "./learnings.js";

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
