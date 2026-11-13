import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

const originalHome = process.env.HOME;
let tmpHome: string;
let hubDir: string;
let app: ReturnType<typeof createServer>;

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-routes-home-"));
  process.env.HOME = tmpHome;
  hubDir = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-routes-hub-"));
  app = createServer({ chainHome: hubDir });
});

afterEach(() => {
  process.env.HOME = originalHome;
});

async function send(method: string, url: string, body?: unknown) {
  const res = await app.request(url, {
    method,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  });
  return { status: res.status, data: (await res.json()) as Record<string, unknown> };
}

describe("security routes", () => {
  it("rescan accepts an empty payload and returns a result", async () => {
    const { status, data } = await send("POST", "/api/security/rescan");
    expect(status).toBe(200);
    expect(data).toHaveProperty("results");
  });

  it("deletes one persisted scan record and stays idempotent", async () => {
    const systemDir = path.join(hubDir, "system");
    await fs.mkdir(systemDir, { recursive: true });
    const scansPath = path.join(systemDir, "security-scans.json");
    await fs.writeFile(
      scansPath,
      JSON.stringify({
        version: 1,
        scans: {
          "skills/ghost": {
            verdict: "fail",
            findings: [{ ruleId: "r", severity: "high", engine: "static", title: "t", detail: "d" }],
            contentHash: "abc",
            scannedAt: "2026-01-05T00:00:00.000Z",
            context: "install",
            engines: ["static"]
          }
        }
      })
    );

    expect((await send("DELETE", "/api/security/scans/skills/ghost")).status).toBe(200);
    const file = JSON.parse(await fs.readFile(scansPath, "utf8")) as { scans: Record<string, unknown> };
    expect(file.scans["skills/ghost"]).toBeUndefined();

    // Second delete is still fine — the record is already gone.
    expect((await send("DELETE", "/api/security/scans/skills/ghost")).status).toBe(200);
  });
});

describe("ai routes validate input", () => {
  it("rejects a draft request without required fields", async () => {
    const { status } = await send("POST", "/api/ai/draft-prompt", { kind: "skills" });
    expect(status).toBe(400);
  });

  it("rejects a classify request without content", async () => {
    const { status } = await send("POST", "/api/ai/classify-asset", {});
    expect(status).toBe(400);
  });

  it("rejects an audit request without required fields", async () => {
    const { status } = await send("POST", "/api/ai/audit-asset", { name: "x" });
    expect(status).toBe(400);
  });

  it("rejects an improve request without required fields", async () => {
    const { status } = await send("POST", "/api/ai/improve-asset", {});
    expect(status).toBe(400);
  });
});

describe("hub and learnings routes", () => {
  it("validate endpoint returns a result on a fresh hub", async () => {
    const { status, data } = await send("GET", "/api/validate");
    expect(status).toBe(200);
    expect(data).toHaveProperty("ok");
  });

  it("learnings timeline returns a result", async () => {
    const { status } = await send("GET", "/api/learnings");
    expect(status).toBe(200);
  });

  it("analysis endpoint returns 200", async () => {
    const { status } = await send("GET", "/api/analysis");
    expect(status).toBe(200);
  });

  it("sync status returns a result", async () => {
    const { status } = await send("GET", "/api/sync/status");
    expect(status).toBe(200);
  });
});
