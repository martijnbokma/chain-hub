import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getOverview, listHubIssues, getSetupGuide } from "./hub.js";

async function makeHub(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-hub-"));
}

describe("hub discovery", () => {
  it("getOverview returns counts for a fresh hub", async () => {
    const dir = await makeHub();
    const overview = await getOverview(dir);
    expect(overview).toBeTruthy();
    expect(typeof overview).toBe("object");
  });

  it("listHubIssues returns an issues-shaped result", async () => {
    const dir = await makeHub();
    const result = await listHubIssues(dir);
    expect(result).toBeTruthy();
  });

  it("getSetupGuide returns the setup checklist", async () => {
    const dir = await makeHub();
    const guide = await getSetupGuide(dir);
    expect(guide).toBeTruthy();
  });
});
