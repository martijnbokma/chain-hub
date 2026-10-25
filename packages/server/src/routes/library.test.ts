import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

// Library routes sync into editors under process.env.HOME; keep every test in a throwaway home.
const originalHome = process.env.HOME;
let tmpHome: string;
let app: ReturnType<typeof createServer>;

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-library-routes-home-"));
  await fs.mkdir(path.join(tmpHome, ".claude"), { recursive: true });
  process.env.HOME = tmpHome;
  const hub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-library-routes-hub-"));
  app = createServer({ chainHome: hub });
});

afterEach(() => {
  process.env.HOME = originalHome;
});

async function send<T>(method: string, url: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await app.request(url, {
    method,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  });
  return { status: res.status, data: (await res.json()) as T };
}

async function writeSkillSource(name: string): Promise<string> {
  const dir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-library-routes-src-")), name);
  await fs.mkdir(path.join(dir, "scripts"), { recursive: true });
  await fs.writeFile(path.join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: Route test skill.\n---\n\n# ${name}\n`, "utf8");
  await fs.writeFile(path.join(dir, "scripts", "run.sh"), "echo hi", "utf8");
  return dir;
}

type Asset = { kind: string; name: string; content: string };

describe("asset edit routes", () => {
  it("updates, renames, converts and filters assets by kind", async () => {
    await send("POST", "/api/library", { kind: "prompts", name: "review", content: "# Review" });

    const updated = await send<Asset>("PUT", "/api/library/prompts/review", { content: "# Review\n\nCheck tests." });
    expect(updated.status).toBe(200);
    expect(updated.data.content).toContain("Check tests.");

    const renamed = await send<Asset>("POST", "/api/library/prompts/review/rename", { name: "pr-review" });
    expect(renamed.data.name).toBe("pr-review");

    const converted = await send<Asset>("POST", "/api/library/prompts/pr-review/convert", { toKind: "rules" });
    expect(converted.data).toMatchObject({ kind: "rules", name: "pr-review" });

    const rules = await send<Asset[]>("GET", "/api/library?kind=rules");
    expect(rules.data.map((asset) => asset.name)).toContain("pr-review");
    const prompts = await send<Asset[]>("GET", "/api/library?kind=prompts");
    expect(prompts.data).toHaveLength(0);
  });
});

describe("skill routes", () => {
  it("installs from a path, lists and reads sidecar files, then forks", async () => {
    const source = await writeSkillSource("route-skill");

    const installed = await send<{ asset: Asset; lockEntry: { sourceType: string } }>(
      "POST",
      "/api/library/skills/install",
      { path: source }
    );
    expect(installed.status).toBe(201);
    expect(installed.data.lockEntry.sourceType).toBe("path");

    const files = await send<{ files: Array<{ path: string }> }>("GET", "/api/library/skills/route-skill/files");
    expect(files.data.files.map((file) => file.path)).toEqual(["scripts", "scripts/run.sh"]);

    const file = await send<{ content: string }>("GET", "/api/library/skills/route-skill/files/scripts/run.sh");
    expect(file.data.content).toBe("echo hi");

    const fork = await send<Asset>("POST", "/api/library/skills/fork", { name: "route-skill" });
    expect(fork.status).toBe(201);
    expect(fork.data.name).toBe("route-skill-local");
  });

  it("installs an uploaded bundle", async () => {
    const bundle = await send<{ asset: Asset }>("POST", "/api/library/skills/install-bundle", {
      name: "uploaded",
      files: [{ path: "SKILL.md", contentBase64: Buffer.from("# Uploaded").toString("base64") }]
    });

    expect(bundle.status).toBe(201);
    expect(bundle.data.asset.name).toBe("uploaded");
  });

  it("updates skills and skips unchanged sources", async () => {
    const source = await writeSkillSource("steady");
    await send("POST", "/api/library/skills/install", { path: source });

    const update = await send<{ results: Array<{ name: string; status: string }> }>("POST", "/api/library/skills/update");

    expect(update.data.results).toEqual([expect.objectContaining({ name: "steady", status: "skipped" })]);
  });

  it("checks updates through GET and POST, verifying path sources exist", async () => {
    const source = await writeSkillSource("local-only");
    await send("POST", "/api/library/skills/install", { path: source });

    for (const [method, url, body] of [
      ["GET", "/api/library/skills/check-updates?force=true", undefined],
      ["POST", "/api/library/skills/check-updates", { force: true }]
    ] as const) {
      const check = await send<{ results: Array<{ name: string; status: string }>; checkedAt: string }>(method, url, body);
      expect(check.status).toBe(200);
      expect(check.data.results).toEqual([expect.objectContaining({ name: "local-only", status: "up_to_date" })]);
    }
  });

  it("unlinks a path-installed skill into an editable asset", async () => {
    const source = await writeSkillSource("detachable");
    await send("POST", "/api/library/skills/install", { path: source });

    const unlinked = await send("POST", "/api/library/skills/detachable/unlink", {});

    expect(unlinked.status).toBe(200);
  });

  it("reports a missing agents lock on migrate", async () => {
    const migrate = await send<{ error: string }>("POST", "/api/library/skills/migrate-agents", {
      lockPath: path.join(tmpHome, "missing-lock.json")
    });

    expect(migrate.status).toBeGreaterThanOrEqual(400);
    expect(migrate.data.error).toMatch(/Agents skill lock not found/);
  });
});

describe("catalog routes", () => {
  it("lists catalog entries with and without the refresh flag", async () => {
    for (const url of ["/api/catalog", "/api/catalog?refresh=true"]) {
      const res = await send<{ entries: unknown[] }>("GET", url);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.entries)).toBe(true);
    }
  });

  it("scopes update checks to a single skill via the name param", async () => {
    const source = await writeSkillSource("named-check");
    await send("POST", "/api/library/skills/install", { path: source });

    const check = await send<{ results: Array<{ name: string }> }>(
      "GET",
      "/api/library/skills/check-updates?name=named-check&force=true"
    );

    expect(check.status).toBe(200);
    expect(check.data.results.map((entry) => entry.name)).toEqual(["named-check"]);
  });
});

describe("discover and import routes", () => {
  it("lists unmanaged editor files and imports one", async () => {
    const rulePath = path.join(tmpHome, ".claude", "rules", "hand-written.md");
    await fs.mkdir(path.dirname(rulePath), { recursive: true });
    await fs.writeFile(rulePath, "# Hand written\n\nAlways test.", "utf8");

    const discovered = await send<Array<{ editorId: string; kind: string; name: string }>>("GET", "/api/library/discover");
    expect(discovered.data).toContainEqual(
      expect.objectContaining({ editorId: "claude-code", kind: "rules", name: "hand-written" })
    );

    const imported = await send<Asset>("POST", "/api/library/import", {
      editorId: "claude-code",
      kind: "rules",
      name: "hand-written"
    });
    expect(imported.status).toBe(201);
    expect(imported.data.content).toContain("Always test.");
  });

  it("returns 404 when the import candidate does not exist", async () => {
    const missing = await send("POST", "/api/library/import", { editorId: "claude-code", kind: "rules", name: "nope" });
    expect(missing.status).toBe(404);
  });
});
