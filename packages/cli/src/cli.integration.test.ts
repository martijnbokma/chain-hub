import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatCliError, runCli } from "./index.js";

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
    expect(logs.some((line) => line.includes("Initialized Chain Hub"))).toBe(true);

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
    await runCli(cliArgv("asset", "discover"));
    const discovered = JSON.parse(logs.join("\n")) as Array<unknown>;
    expect(Array.isArray(discovered)).toBe(true);

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

  it("handles guide, setup, capture, and reflect", async () => {
    await runCli(cliArgv("init"));
    logs = [];
    await runCli(cliArgv("guide"));
    expect(logs.some((line) => line.includes("initialize"))).toBe(true);

    logs = [];
    await runCli(cliArgv("setup"));
    expect(logs.length).toBeGreaterThan(0);

    logs = [];
    await runCli(cliArgv("capture", "--event", "note", "--skill", "cli-test", "--summary", "CLI capture test"));
    const event = JSON.parse(logs.join("\n")) as { type: string; skill: string };
    expect(event.skill).toBe("cli-test");

    logs = [];
    await runCli(cliArgv("capture", "--event", "correction", "--skill", "cli-test", "--summary", "CLI fix"));
    logs = [];
    await runCli(cliArgv("resolve", "cli-test"));
    const resolved = JSON.parse(logs.join("\n")) as { skill: string; resolvedCount: number };
    expect(resolved.skill).toBe("cli-test");
    expect(resolved.resolvedCount).toBe(1);

    logs = [];
    await runCli(cliArgv("reflect", "--write"));
    expect(logs.some((line) => line.includes("Reflection written to"))).toBe(true);

    logs = [];
    await runCli(cliArgv("reflect", "--json"));
    const jsonReport = JSON.parse(logs.join("\n")) as { totalSkills: number };
    expect(jsonReport).toHaveProperty("totalSkills");

    logs = [];
    await runCli(cliArgv("reflect"));
    expect(logs.length).toBeGreaterThan(0);

    await expect(runCli(cliArgv("capture", "--event", "invalid-type", "--skill", "foo", "--summary", "bar"))).rejects.toThrow();
  });

  it("rejects invalid input with a readable message instead of doing nothing", async () => {
    const emptySummary = runCli(cliArgv("capture", "--event", "note", "--skill", "foo", "--summary", ""));
    await expect(emptySummary).rejects.toSatisfy((error: unknown) => /summary/.test(formatCliError(error)));

    const bogusKind = runCli(cliArgv("asset", "list", "--kind", "bogus"));
    await expect(bogusKind).rejects.toSatisfy((error: unknown) => /Invalid enum value/.test(formatCliError(error)));

    await expect(runCli(cliArgv("asset", "show", "--kind", "skills", "--name", "missing"))).rejects.toThrow(
      "Asset not found: skills/missing"
    );
  });

  it("prints the package version", async () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    });
    await expect(runCli(cliArgv("--version"))).rejects.toMatchObject({ code: "commander.version", exitCode: 0 });
    expect(writes.join("")).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("rejects invalid port on hub command", async () => {
    await runCli(cliArgv("hub", "--port", "999999", "--no-open"));
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });
});
