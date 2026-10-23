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
  vi.stubGlobal("fetch", vi.fn(async () => {
    throw new Error("connection refused");
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("detects an already-running hub and opens the dev server URL when Vite is active", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      const urlString = String(url);
      if (urlString.includes("2342/api/overview")) {
        return new Response(JSON.stringify({ chainHome: hub }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (urlString.includes("4320")) {
        return new Response("<html><title>Chain Hub</title></html>", { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }));

    await runHubCommand({ chainHome: hub, port: "2342", open: true, cliDir });

    expect(mocks.startServer).not.toHaveBeenCalled();
    expect(mocks.execFile).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(["http://localhost:4320"]), expect.any(Function));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("http://localhost:4320"));
  });

  it("detects an already-running hub and opens direct URL when Vite is not active", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      const urlString = String(url);
      if (urlString.includes("2342/api/overview")) {
        return new Response(JSON.stringify({ chainHome: hub }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      throw new Error("connection refused");
    }));

    await runHubCommand({ chainHome: hub, port: "2342", open: true, cliDir });

    expect(mocks.startServer).not.toHaveBeenCalled();
    expect(mocks.execFile).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(["http://127.0.0.1:2342"]), expect.any(Function));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("http://127.0.0.1:2342"));
  });

  it("handles EADDRINUSE gracefully when port is occupied by another application", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const inUseError = new Error("listen EADDRINUSE: address already in use 127.0.0.1:2342");
    Object.assign(inUseError, { code: "EADDRINUSE" });
    mocks.startServer.mockRejectedValueOnce(inUseError);

    await runHubCommand({ chainHome: hub, port: "2342", open: true, cliDir });

    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Port 2342 is already in use by another application"));
    expect(mocks.execFile).not.toHaveBeenCalled();
  });
});
