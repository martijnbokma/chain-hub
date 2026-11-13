import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AiSettingsPublic, HealthSubsystemId, Integration, SyncStatus } from "@chain-hub/contracts";

import { buildHealthReport, getHealth, type HealthInputs } from "./health.js";
import { listHubIssues } from "./hub.js";

async function makeHub(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-health-"));
}

async function writeSystemJson(dir: string, file: string, data: unknown): Promise<void> {
  const systemDir = path.join(dir, "system");
  await fs.mkdir(systemDir, { recursive: true });
  await fs.writeFile(path.join(systemDir, file), JSON.stringify(data));
}

function subsystem(report: Awaited<ReturnType<typeof getHealth>>, id: HealthSubsystemId) {
  const found = report.subsystems.find((entry) => entry.id === id);
  expect(found, `subsystem ${id}`).toBeTruthy();
  return found!;
}

describe("getHealth", () => {
  it("returns a card for every subsystem on a fresh hub", async () => {
    const dir = await makeHub();
    const report = await getHealth(dir);

    expect(report.subsystems.map((entry) => entry.id)).toEqual([
      "structure",
      "skills",
      "editors",
      "sync",
      "security",
      "ai"
    ]);
    for (const entry of report.subsystems) {
      expect(["healthy", "warning", "error", "inactive"]).toContain(entry.status);
      expect(Array.isArray(entry.issues)).toBe(true);
    }
    // Nothing set up on a fresh hub: no hard failures.
    expect(report.status).not.toBe("error");
  });

  it("flags upstream skill updates and failed checks under skills", async () => {
    const dir = await makeHub();
    await writeSystemJson(dir, "assets-lock.json", {
      version: 1,
      entries: {
        "skills/pdf": {
          sourceType: "git",
          source: "https://github.com/example/skills.git",
          subdir: "pdf",
          commitSha: "aaa",
          installedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          lastCheckedAt: "2026-01-02T00:00:00.000Z",
          latestSha: "bbb"
        },
        "skills/broken": {
          sourceType: "git",
          source: "https://github.com/example/skills.git",
          subdir: "broken",
          commitSha: "ccc",
          installedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          lastCheckError: "remote unreachable"
        }
      }
    });

    const report = await getHealth(dir);
    const skills = subsystem(report, "skills");

    // A failed update check is an error and lands in the skills group.
    expect(skills.status).toBe("error");
    expect(skills.issues.some((issue) => issue.kind === "skill-check")).toBe(true);
    expect(skills.metrics.find((metric) => metric.label === "Updates available")?.value).toBe("1");
    expect(skills.lastActivityAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("surfaces failed security scans as errors, grouped under security", async () => {
    const dir = await makeHub();
    // The scanned skill exists in the library, so its fail verdict is a real error.
    await fs.mkdir(path.join(dir, "skills", "evil"), { recursive: true });
    await fs.writeFile(path.join(dir, "skills", "evil", "SKILL.md"), "# evil\n");
    await writeSystemJson(dir, "security-scans.json", {
      version: 1,
      scans: {
        "skills/evil": {
          verdict: "fail",
          findings: [
            { ruleId: "credential", severity: "high", engine: "static", title: "Hardcoded credential", detail: "found a token" }
          ],
          contentHash: "abc",
          scannedAt: "2026-01-03T00:00:00.000Z",
          context: "install",
          engines: ["static"]
        },
        "skills/fine": {
          verdict: "pass",
          findings: [],
          contentHash: "def",
          scannedAt: "2026-01-02T00:00:00.000Z",
          context: "install",
          engines: ["static"]
        }
      }
    });

    const report = await getHealth(dir);
    const security = subsystem(report, "security");

    expect(security.status).toBe("error");
    expect(report.status).toBe("error");
    expect(security.issues).toHaveLength(1);
    expect(security.issues[0].kind).toBe("security");
    // The same problem appears in the unified issue list (shared with Overview).
    const all = await listHubIssues(dir);
    expect(all.issues.some((issue) => issue.id === "security:skills/evil")).toBe(true);
  });

  it("treats an overridden fail verdict as a warning, not an error", async () => {
    const dir = await makeHub();
    await writeSystemJson(dir, "security-scans.json", {
      version: 1,
      scans: {
        "skills/risky": {
          verdict: "fail",
          overriddenAt: "2026-01-04T00:00:00.000Z",
          findings: [
            { ruleId: "remote-code-exec", severity: "high", engine: "static", title: "Shell out", detail: "child_process" }
          ],
          contentHash: "abc",
          scannedAt: "2026-01-04T00:00:00.000Z",
          context: "install",
          engines: ["static"]
        }
      }
    });

    const report = await getHealth(dir);
    const security = subsystem(report, "security");

    expect(security.status).toBe("warning");
    expect(security.issues[0].severity).toBe("warning");
  });

  it("downgrades scan records for removed assets to a warning", async () => {
    const dir = await makeHub();
    // "skills/ghost" has a scan record but no asset on disk — stale, not an error.
    await writeSystemJson(dir, "security-scans.json", {
      version: 1,
      scans: {
        "skills/ghost": {
          verdict: "fail",
          findings: [
            { ruleId: "credential", severity: "high", engine: "static", title: "Token", detail: "leaked" }
          ],
          contentHash: "abc",
          scannedAt: "2026-01-05T00:00:00.000Z",
          context: "install",
          engines: ["static"]
        }
      }
    });

    const report = await getHealth(dir);
    const security = subsystem(report, "security");

    expect(security.status).toBe("warning");
    expect(security.issues[0].severity).toBe("warning");
    expect(security.issues[0].title).toContain("removed asset");
    expect(security.issues[0].actions).toEqual(["remove-scan"]);
  });
});

function makeSyncStatus(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return {
    connected: true,
    enabled: true,
    autoSync: true,
    remote: { provider: "github", url: "https://github.com/o/r.git", repo: "o/r" },
    authMethod: "gh",
    machineId: "machine",
    lastSyncAt: "2026-01-05T00:00:00.000Z",
    lastSyncError: null,
    uncommitted: 0,
    ahead: 0,
    behind: 0,
    conflicts: [],
    ...overrides
  };
}

function makeAiSettings(overrides: Partial<AiSettingsPublic> = {}): AiSettingsPublic {
  return {
    provider: "anthropic",
    models: {
      anthropic: "claude",
      openai: "gpt",
      mistral: "mistral",
      ollama: "llama",
      gemini: "gemini",
      groq: "groq",
      openrouter: "auto",
      deepseek: "deepseek",
      cerebras: "cerebras"
    },
    ollamaBaseUrl: "http://127.0.0.1:11434",
    anthropicApiKeyConfigured: true,
    openaiApiKeyConfigured: false,
    mistralApiKeyConfigured: false,
    geminiApiKeyConfigured: false,
    groqApiKeyConfigured: false,
    openrouterApiKeyConfigured: false,
    deepseekApiKeyConfigured: false,
    cerebrasApiKeyConfigured: false,
    ...overrides
  };
}

function makeInputs(overrides: Partial<HealthInputs> = {}): HealthInputs {
  return {
    issues: [],
    validation: { ok: true, issues: [], checks: [{ id: "dirs", label: "dirs", status: "pass" }] },
    assets: [],
    drift: { lockPath: null, missingNames: [], missingCount: 0 },
    lock: { version: 1, skills: {} },
    scans: { version: 1, scans: {} },
    sync: null,
    integrations: [],
    ai: makeAiSettings(),
    ...overrides
  };
}

describe("buildHealthReport", () => {
  it("stays healthy on pending changes while auto-sync is on", () => {
    const report = buildHealthReport(
      makeInputs({ sync: makeSyncStatus({ uncommitted: 3, ahead: 1 }) })
    );
    const sync = report.subsystems.find((entry) => entry.id === "sync")!;

    expect(sync.status).toBe("healthy");
    expect(sync.metrics.find((metric) => metric.label === "Pending changes")?.value).toBe("4");
  });

  it("warns on pending changes when auto-sync is off", () => {
    const report = buildHealthReport(
      makeInputs({ sync: makeSyncStatus({ autoSync: false, uncommitted: 2 }) })
    );
    const sync = report.subsystems.find((entry) => entry.id === "sync")!;

    expect(sync.status).toBe("warning");
    expect(sync.summary).toContain("2 changes");
  });

  it("marks sync inactive when backup is not connected", () => {
    const report = buildHealthReport(
      makeInputs({ sync: makeSyncStatus({ connected: false, enabled: false, remote: null }) })
    );

    expect(report.subsystems.find((entry) => entry.id === "sync")!.status).toBe("inactive");
  });

  it("warns when an installed editor is not connected", () => {
    const editor = (overrides: Partial<Integration>): Integration => ({
      id: "cursor",
      label: "Cursor",
      targetPaths: [],
      installed: true,
      connected: true,
      mode: "managed",
      supportedKinds: ["skills"],
      unsupportedKinds: [],
      ...overrides
    });
    const report = buildHealthReport(
      makeInputs({ integrations: [editor({}), editor({ id: "zed", label: "Zed", connected: false })] })
    );
    const editors = report.subsystems.find((entry) => entry.id === "editors")!;

    expect(editors.status).toBe("warning");
    expect(editors.summary).toContain("Zed");
  });

  it("marks AI inactive without a configured key, healthy for Ollama", () => {
    const unconfigured = buildHealthReport(
      makeInputs({ ai: makeAiSettings({ anthropicApiKeyConfigured: false }) })
    );
    expect(unconfigured.subsystems.find((entry) => entry.id === "ai")!.status).toBe("inactive");

    const ollama = buildHealthReport(makeInputs({ ai: makeAiSettings({ provider: "ollama" }) }));
    expect(ollama.subsystems.find((entry) => entry.id === "ai")!.status).toBe("healthy");
  });
});
