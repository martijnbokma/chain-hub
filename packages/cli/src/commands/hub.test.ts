import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  startServer: vi.fn(async () => undefined),
  execFile: vi.fn(),
  syncAgentsSkillsIntoHub: vi.fn(async () => ({ lockPath: "", results: [{ name: "a", status: "migrated" }] }))
}));

vi.mock("@chain-hub/server", () => ({ startServer: mocks.startServer }));
vi.mock("node:child_process", () => ({ execFile: mocks.execFile }));
vi.mock("@chain-hub/domain", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@chain-hub/domain")>()),
  syncAgentsSkillsIntoHub: mocks.syncAgentsSkillsIntoHub
}));

const { runHubCommand } = await import("./hub.js");

let hub: string;
let cliDir: string;

beforeEach(async () => {
  hub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-cli-hub-cmd-"));
  cliDir = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-cli-dir-"));
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  mocks.startServer.mockClear();
  mocks.execFile.mockClear();
  mocks.syncAgentsSkillsIntoHub.mockClear();
  process.exitCode = 0;
});

describe("runHubCommand", () => {
  it("serves the dashboard bundled next to the CLI and opens the browser", async () => {
    await fs.mkdir(path.join(cliDir, "web"));

    await runHubCommand({ chainHome: hub, port: "4321", open: true, cliDir });

    expect(mocks.startServer).toHaveBeenCalledWith({ chainHome: hub, port: 4321, staticRoot: path.join(cliDir, "web") });
    expect(mocks.execFile).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(["http://127.0.0.1:4321"]), expect.any(Function));
    await vi.waitFor(() => expect(console.log).toHaveBeenCalledWith(expect.stringContaining("1 migrated")));
  });

  it("does not open a browser with --no-open", async () => {
    await runHubCommand({ chainHome: hub, port: "4321", open: false, cliDir });

    expect(mocks.startServer).toHaveBeenCalled();
    expect(mocks.execFile).not.toHaveBeenCalled();
  });

  it("rejects an invalid port before starting the server", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await runHubCommand({ chainHome: hub, port: "0", open: false, cliDir });

    expect(process.exitCode).toBe(1);
    expect(mocks.startServer).not.toHaveBeenCalled();
  });

  it("logs, but survives, a failed agents skill sync", async () => {
    mocks.syncAgentsSkillsIntoHub.mockRejectedValueOnce(new Error("lock unreadable"));

    await runHubCommand({ chainHome: hub, port: "4321", open: false, cliDir });

    await vi.waitFor(() =>
      expect(console.warn).toHaveBeenCalledWith("Agents skill sync skipped: lock unreadable")
    );
  });
});
