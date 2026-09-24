import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createServer } from "./index.js";

const originalHome = process.env.HOME;
let hub: string;

beforeEach(async () => {
  hub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-guard-hub-"));
  process.env.HOME = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-guard-home-"));
});

afterEach(() => {
  process.env.HOME = originalHome;
});

const createRule = JSON.stringify({ kind: "rules", name: "guard-test", content: "# Guard test" });

describe("request guard", () => {
  it("rejects a non-loopback Host (DNS rebinding)", async () => {
    const app = createServer({ chainHome: hub });
    const response = await app.request("http://evil.example:2342/api/overview");
    expect(response.status).toBe(403);
  });

  it("allows loopback hosts", async () => {
    const app = createServer({ chainHome: hub });
    for (const host of ["127.0.0.1:2342", "localhost:2342", "[::1]:2342"]) {
      const response = await app.request(`http://${host}/api/overview`);
      expect(response.status).toBe(200);
    }
  });

  it("rejects a cross-origin POST", async () => {
    const app = createServer({ chainHome: hub });
    const response = await app.request("http://127.0.0.1:2342/api/library", {
      method: "POST",
      headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
      body: createRule
    });
    expect(response.status).toBe(403);
    await expect(fs.access(path.join(hub, "rules", "guard-test.md"))).rejects.toThrow();
  });

  it("rejects cross-site requests flagged by Sec-Fetch-Site, including reads", async () => {
    const app = createServer({ chainHome: hub });
    const response = await app.request("http://127.0.0.1:2342/api/library", {
      headers: { "Sec-Fetch-Site": "cross-site" }
    });
    expect(response.status).toBe(403);
  });

  it("rejects a text/plain body (CORS simple request)", async () => {
    const app = createServer({ chainHome: hub });
    const response = await app.request("http://127.0.0.1:2342/api/library", {
      method: "POST",
      headers: { "Content-Type": "text/plain", "Content-Length": String(createRule.length) },
      body: createRule
    });
    expect(response.status).toBe(415);
  });

  it("rejects Origin: null", async () => {
    const app = createServer({ chainHome: hub });
    const response = await app.request("http://127.0.0.1:2342/api/integrations/setup", {
      method: "POST",
      headers: { Origin: "null" }
    });
    expect(response.status).toBe(403);
  });

  it("accepts a same-origin JSON POST from the dashboard", async () => {
    const app = createServer({ chainHome: hub });
    const response = await app.request("http://127.0.0.1:2342/api/library", {
      method: "POST",
      headers: { Origin: "http://127.0.0.1:2342", "Content-Type": "application/json" },
      body: createRule
    });
    expect(response.status).toBe(201);
  });

  it("accepts requests without browser headers (CLI, curl)", async () => {
    const app = createServer({ chainHome: hub });
    const response = await app.request("http://127.0.0.1:2342/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: createRule
    });
    expect(response.status).toBe(201);
  });

  it("accepts loopback dev origins only when enabled", async () => {
    const init = {
      method: "POST",
      headers: { Origin: "http://localhost:4320", "Content-Type": "application/json" },
      body: createRule
    };
    const strict = createServer({ chainHome: hub });
    expect((await strict.request("http://127.0.0.1:2342/api/library", init)).status).toBe(403);

    const dev = createServer({ chainHome: hub, requestGuard: { allowLoopbackOrigins: true } });
    expect((await dev.request("http://127.0.0.1:2342/api/library", init)).status).toBe(201);
  });

  it("forbids framing the dashboard", async () => {
    const app = createServer({ chainHome: hub });
    const response = await app.request("http://127.0.0.1:2342/api/overview");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });
});
