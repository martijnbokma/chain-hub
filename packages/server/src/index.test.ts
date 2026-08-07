import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createServer } from "./index.js";

async function makeTmpHub(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-server-test-"));
}

// Asset CRUD syncs to editor adapters, which write under os.homedir(). Point HOME
// at a throwaway dir for every test in this file so we never touch the real
// developer machine's ~/.claude, ~/.cursor, etc.
const originalHome = process.env.HOME;
let tmpHome: string;

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-server-home-"));
  process.env.HOME = tmpHome;
});

afterEach(() => {
  process.env.HOME = originalHome;
});

async function getJson<T>(app: ReturnType<typeof createServer>, url: string): Promise<T> {
  const res = await app.request(url);
  return res.json() as Promise<T>;
}

async function postJson<T>(
  app: ReturnType<typeof createServer>,
  url: string,
  body: unknown
): Promise<{ status: number; data: T }> {
  const res = await app.request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return { status: res.status, data: (await res.json()) as T };
}

describe("GET /api/overview", () => {
  it("returns a valid overview", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    const data = await getJson<{ chainHome: string; health: { ok: boolean } }>(app, "/api/overview");
    expect(data.chainHome).toBe(hub);
    expect(typeof data.health).toBe("object");
  });
});

describe("GET /api/validate", () => {
  it("passes on a fresh hub", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    const data = await getJson<{ ok: boolean; issues: string[] }>(app, "/api/validate");
    expect(data.ok).toBe(true);
    expect(data.issues).toHaveLength(0);
  });
});

describe("Library CRUD", () => {
  it("POST /api/library creates an asset", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    const { status, data } = await postJson<{ name: string; kind: string }>(app, "/api/library", {
      kind: "skills",
      name: "integration-skill",
      content: "# Integration Skill"
    });
    expect(status).toBe(201);
    expect(data.name).toBe("integration-skill");
    expect(data.kind).toBe("skills");

    const skillPath = path.join(tmpHome, ".claude", "skills", "integration-skill", "SKILL.md");
    await expect(fs.stat(skillPath)).resolves.toBeDefined();
  });

  it("GET /api/library lists assets", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    await postJson(app, "/api/library", { kind: "skills", name: "list-test", content: "# Test" });
    const list = await getJson<{ name: string }[]>(app, "/api/library");
    expect(list.some((a) => a.name === "list-test")).toBe(true);
  });

  it("GET /api/library/:kind/:name returns asset detail", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    await postJson(app, "/api/library", { kind: "workflows", name: "my-flow", content: "# Flow" });
    const detail = await getJson<{ name: string; content: string }>(app, "/api/library/workflows/my-flow");
    expect(detail.name).toBe("my-flow");
    expect(detail.content).toContain("Flow");
  });

  it("DELETE /api/library/:kind/:name removes asset", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    await postJson(app, "/api/library", { kind: "rules", name: "del-rule", content: "# Rule" });

    const res = await app.request("/api/library/rules/del-rule", { method: "DELETE" });
    expect(res.status).toBe(200);

    const list = await getJson<{ name: string }[]>(app, "/api/library?kind=rules");
    expect(list.some((a) => a.name === "del-rule")).toBe(false);
  });
});

describe("Memory notes", () => {
  it("POST /api/memory/notes creates a note", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    const { status, data } = await postJson<{ relativePath: string }>(app, "/api/memory/notes", {
      name: "server-test-note",
      content: "# Server Note\n\nHello from integration test."
    });
    expect(status).toBe(201);
    expect(data.relativePath).toContain("server-test-note");
  });

  it("GET /api/memory/notes lists notes", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    await postJson(app, "/api/memory/notes", { name: "listed-note", content: "# Listed" });
    const list = await getJson<{ relativePath: string }[]>(app, "/api/memory/notes");
    expect(list.some((n) => n.relativePath.includes("listed-note"))).toBe(true);
  });

  it("GET /api/memory/note?path= returns note content", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    const { data: created } = await postJson<{ relativePath: string }>(app, "/api/memory/notes", {
      name: "fetch-me",
      content: "# Fetch Me\n\nUnique content abc123."
    });
    const note = await getJson<{ content: string }>(
      app,
      `/api/memory/note?path=${encodeURIComponent(created.relativePath)}`
    );
    expect(note.content).toContain("abc123");
  });

  it("GET /api/memory/search?q= returns matching notes", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    await postJson(app, "/api/memory/notes", { name: "searchable", content: "# Searchable\n\nxyz-unique-token here." });
    const results = await getJson<{ relativePath: string }[]>(app, "/api/memory/search?q=xyz-unique-token");
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("Learnings", () => {
  it("POST /api/learnings/capture appends event", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    const { status, data } = await postJson<{ id: string; type: string; skill: string }>(
      app,
      "/api/learnings/capture",
      { type: "success", skill: "server-skill", summary: "Integration test passed" }
    );
    expect(status).toBe(201);
    expect(data.type).toBe("success");
    expect(data.skill).toBe("server-skill");
    expect(data.id).toBeTruthy();
  });

  it("GET /api/learnings returns timeline with new event", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    await postJson(app, "/api/learnings/capture", { type: "note", skill: "alpha", summary: "a note" });
    await postJson(app, "/api/learnings/capture", { type: "correction", skill: "beta", summary: "a fix" });

    const timeline = await getJson<{
      totalEvents: number;
      returnedEvents: number;
      skippedLines: number;
      status: string;
    }>(app, "/api/learnings");
    expect(timeline.totalEvents).toBe(2);
    expect(timeline.returnedEvents).toBe(2);
    expect(timeline.skippedLines).toBe(0);
    expect(timeline.status).toBe("active");
  });

  it("GET /api/learnings?limit=1&offset=0 paginates", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    for (let i = 0; i < 3; i++) {
      await postJson(app, "/api/learnings/capture", { type: "note", skill: `s${i}`, summary: `event ${i}` });
    }
    const page = await getJson<{ returnedEvents: number; offset: number }>(
      app,
      "/api/learnings?limit=1&offset=0"
    );
    expect(page.returnedEvents).toBe(1);
    expect(page.offset).toBe(0);
  });

  it("GET /api/learnings/reflect returns per-skill report", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    await postJson(app, "/api/learnings/capture", { type: "success", skill: "reflect-skill", summary: "win" });
    await postJson(app, "/api/learnings/capture", { type: "success", skill: "reflect-skill", summary: "win again" });

    const report = await getJson<{ totalSkills: number; skills: { skill: string; trend: string }[] }>(
      app,
      "/api/learnings/reflect"
    );
    expect(report.totalSkills).toBe(1);
    expect(report.skills[0].skill).toBe("reflect-skill");
    expect(report.skills[0].trend).toBe("improving");
  });
});

describe("GET /api/setup", () => {
  it("returns a setup guide with steps", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    const guide = await getJson<{ steps: { id: string }[] }>(app, "/api/setup");
    expect(Array.isArray(guide.steps)).toBe(true);
    expect(guide.steps.length).toBeGreaterThan(0);
  });
});

describe("AI settings and draft-prompt", () => {
  it("GET /api/settings/ai returns defaults without secrets", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    const settings = await getJson<{
      provider: string;
      anthropicApiKeyConfigured: boolean;
      openaiApiKeyConfigured: boolean;
    }>(app, "/api/settings/ai");
    expect(settings.provider).toBe("ollama");
    expect(settings.anthropicApiKeyConfigured).toBe(false);
    expect(settings.openaiApiKeyConfigured).toBe(false);
  });

  it("PUT /api/settings/ai stores provider and key without leaking it", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    const res = await app.request("/api/settings/ai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        openaiApiKey: "sk-secret-for-test"
      })
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      provider: string;
      openaiApiKeyConfigured: boolean;
    };
    expect(data.provider).toBe("openai");
    expect(data.openaiApiKeyConfigured).toBe(true);
    expect(JSON.stringify(data)).not.toContain("sk-secret-for-test");
  });

  it("POST /api/ai/draft-prompt rejects empty intent", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    const res = await app.request("/api/ai/draft-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "" })
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("POST /api/ai/draft-prompt returns 400 when Anthropic key is missing", async () => {
    const hub = await makeTmpHub();
    const app = createServer({ chainHome: hub });
    await app.request("/api/settings/ai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "anthropic" })
    });

    const res = await app.request("/api/ai/draft-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "Write a helpful prompt" })
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Anthropic API key/i);
  });
});
