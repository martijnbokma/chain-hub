import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runCli } from "./index.js";

const originalHome = process.env.HOME;
let tmpHome: string;
let tmpHub: string;
let logs: string[];

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-cli-home-"));
  tmpHub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-cli-hub-"));
  process.env.HOME = tmpHome;
  logs = [];
  vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  process.env.HOME = originalHome;
  vi.restoreAllMocks();
});

function cliArgv(...args: string[]): string[] {
  return ["node", "chain", "--chain-home", tmpHub, ...args];
}

describe("CLI integration", () => {
  it("init creates a hub and status reports it", async () => {
    await runCli(cliArgv("init"));
    expect(logs.some((line) => line.includes("Initialized Chain Hub v2"))).toBe(true);

    logs = [];
    await runCli(cliArgv("status"));
    const status = JSON.parse(logs.join("\n")) as {
      chainHome: string;
      health: { initialized: boolean };
    };
    expect(status.chainHome).toBe(tmpHub);
    expect(status.health.initialized).toBe(true);
  });

  it("asset create + list + show round-trip", async () => {
    await runCli(cliArgv("init"));
    logs = [];

    await runCli(
      cliArgv(
        "asset",
        "create",
        "--kind",
        "skills",
        "--name",
        "cli-skill",
        "--content",
        "# CLI Skill\n\nCreated by integration test."
      )
    );

    const created = JSON.parse(logs.join("\n")) as { name: string; kind: string };
    expect(created.name).toBe("cli-skill");
    expect(created.kind).toBe("skills");

    logs = [];
    await runCli(cliArgv("asset", "list", "--kind", "skills"));
    const listed = JSON.parse(logs.join("\n")) as Array<{ name: string }>;
    expect(listed.some((asset) => asset.name === "cli-skill")).toBe(true);

    logs = [];
    await runCli(cliArgv("asset", "show", "--kind", "skills", "--name", "cli-skill"));
    const shown = JSON.parse(logs.join("\n")) as { content: string };
    expect(shown.content).toContain("Created by integration test");
  });

  it("validate passes on a fresh hub", async () => {
    await runCli(cliArgv("init"));
    logs = [];
    await runCli(cliArgv("validate"));
    const validation = JSON.parse(logs.join("\n")) as { ok: boolean; issues: string[] };
    expect(validation.ok).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });
});
