import {
  hasSkillUpdate,
  isUpstreamOwnedSkill,
  type AiProvider,
  type AiSettingsPublic,
  type HealthReport,
  type HealthStatus,
  type HealthSubsystem,
  type HealthSubsystemId,
  type HubIssue,
  type HubIssueKind,
  type Integration
} from "@chain-hub/contracts";

import { getAiSettingsPublic } from "./ai-settings.js";
import { initializeHub, resolveChainHome } from "./core.js";
import { buildHubIssues, collectHubIssueInputs, type HubIssueInputs } from "./hub.js";
import { getIntegrations } from "./integrations.js";

/** Which subsystem card owns each issue kind. */
const ISSUE_SUBSYSTEM: Record<HubIssueKind, HealthSubsystemId> = {
  health: "structure",
  compat: "structure",
  "agents-drift": "skills",
  "skill-check": "skills",
  "skill-update": "skills",
  sync: "sync",
  security: "security"
};

const SUBSYSTEM_ORDER: Array<{ id: HealthSubsystemId; label: string }> = [
  { id: "structure", label: "Hub structure" },
  { id: "skills", label: "Skills & updates" },
  { id: "editors", label: "Editors" },
  { id: "sync", label: "Sync & backup" },
  { id: "security", label: "Security scans" },
  { id: "ai", label: "AI provider" }
];

const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  mistral: "Mistral",
  ollama: "Ollama",
  gemini: "Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
  cerebras: "Cerebras"
};

function worst(statuses: HealthStatus[]): "healthy" | "warning" | "error" {
  if (statuses.includes("error")) {
    return "error";
  }
  if (statuses.includes("warning")) {
    return "warning";
  }
  return "healthy";
}

/** Status implied by the issues alone; null means "no issue-driven signal". */
function issueStatus(issues: HubIssue[]): "error" | "warning" | null {
  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }
  return issues.length > 0 ? "warning" : null;
}

function latestTimestamp(values: Array<string | null | undefined>): string | null {
  let latest: string | null = null;
  for (const value of values) {
    if (value && (!latest || value > latest)) {
      latest = value;
    }
  }
  return latest;
}

function aiKeyConfigured(settings: AiSettingsPublic): boolean {
  const flags: Record<Exclude<AiProvider, "ollama">, boolean> = {
    anthropic: settings.anthropicApiKeyConfigured,
    openai: settings.openaiApiKeyConfigured,
    mistral: settings.mistralApiKeyConfigured,
    gemini: settings.geminiApiKeyConfigured,
    groq: settings.groqApiKeyConfigured,
    openrouter: settings.openrouterApiKeyConfigured,
    deepseek: settings.deepseekApiKeyConfigured,
    cerebras: settings.cerebrasApiKeyConfigured
  };
  if (settings.provider === "ollama") {
    return Boolean(settings.ollamaBaseUrl.trim());
  }
  return flags[settings.provider];
}

/** Everything the health board is derived from: the issue inputs plus the rest. */
export interface HealthInputs extends HubIssueInputs {
  issues: HubIssue[];
  integrations: Integration[];
  ai: AiSettingsPublic;
}

/** Pure: per-subsystem status board from collected inputs. */
export function buildHealthReport(inputs: HealthInputs): HealthReport {
  const { issues, validation, assets, drift, lock, scans, sync, integrations, ai } = inputs;

  const issuesBySubsystem = new Map<HealthSubsystemId, HubIssue[]>();
  for (const issue of issues) {
    const id = ISSUE_SUBSYSTEM[issue.kind];
    issuesBySubsystem.set(id, [...(issuesBySubsystem.get(id) ?? []), issue]);
  }
  const issuesFor = (id: HealthSubsystemId): HubIssue[] => issuesBySubsystem.get(id) ?? [];

  // --- Hub structure ---------------------------------------------------------
  const structureIssues = issuesFor("structure");
  const checksPassed = validation.checks.filter((check) => check.status === "pass").length;
  const structureStatus = issueStatus(structureIssues) ?? "healthy";
  const structure: HealthSubsystem = {
    id: "structure",
    label: "Hub structure",
    status: structureStatus,
    summary:
      structureStatus === "healthy"
        ? "Folder layout and asset structure are valid."
        : `${structureIssues.length} structural issue${structureIssues.length === 1 ? "" : "s"} found.`,
    metrics: [
      { label: "Assets indexed", value: String(assets.length) },
      { label: "Validation checks", value: `${checksPassed}/${validation.checks.length} passed` }
    ],
    issues: structureIssues
  };

  // --- Skills & updates -------------------------------------------------------
  const tracked = Object.entries(lock.skills).filter(([, entry]) => !entry.unlinkedAt && isUpstreamOwnedSkill(entry));
  const updatesAvailable = tracked.filter(([, entry]) => hasSkillUpdate(entry)).length;
  const skillsIssues = issuesFor("skills");
  const skillsStatus = issueStatus(skillsIssues) ?? (updatesAvailable > 0 ? "warning" : "healthy");
  const skills: HealthSubsystem = {
    id: "skills",
    label: "Skills & updates",
    status: skillsStatus,
    summary:
      skillsStatus === "healthy"
        ? "All upstream skills are checked and current."
        : skillsIssues.length > 0
          ? `${skillsIssues.length} problem${skillsIssues.length === 1 ? "" : "s"} with tracked skills${
              updatesAvailable > 0 ? `, ${updatesAvailable} update${updatesAvailable === 1 ? "" : "s"} available` : ""
            }.`
          : `${updatesAvailable} update${updatesAvailable === 1 ? "" : "s"} available for upstream skills.`,
    metrics: [
      { label: "Upstream skills", value: String(tracked.length) },
      { label: "Updates available", value: String(updatesAvailable) },
      { label: "~/.agents drift", value: String(drift.missingCount) }
    ],
    lastActivityAt: latestTimestamp(tracked.map(([, entry]) => entry.lastCheckedAt)),
    issues: skillsIssues
  };

  // --- Editors ----------------------------------------------------------------
  const installed = integrations.filter((integration) => integration.installed);
  const connected = installed.filter((integration) => integration.connected);
  const unconnected = installed.filter((integration) => !integration.connected);
  const editorsStatus: HealthStatus =
    installed.length === 0 ? "inactive" : unconnected.length === 0 ? "healthy" : "warning";
  const editors: HealthSubsystem = {
    id: "editors",
    label: "Editors",
    status: editorsStatus,
    summary:
      installed.length === 0
        ? "No supported editors found on this machine."
        : unconnected.length === 0
          ? `All ${installed.length} installed editor${installed.length === 1 ? "" : "s"} connected.`
          : `${unconnected.map((integration) => integration.label).join(", ")} installed but not connected.`,
    metrics: [{ label: "Connected", value: `${connected.length}/${installed.length} installed` }],
    issues: issuesFor("editors")
  };

  // --- Sync & backup -----------------------------------------------------------
  const syncIssues = issuesFor("sync");
  const pending = sync ? sync.uncommitted + sync.ahead : 0;
  // Pending changes only warn when auto-sync is off — the periodic server
  // sync converges them by itself otherwise (same policy as listHubIssues).
  const syncStatus: HealthStatus =
    !sync || !sync.connected
      ? "inactive"
      : (issueStatus(syncIssues) ?? (sync.autoSync ? "healthy" : pending > 0 ? "warning" : "healthy"));
  const syncSubsystem: HealthSubsystem = {
    id: "sync",
    label: "Sync & backup",
    status: syncStatus,
    summary:
      !sync || !sync.connected
        ? "Cloud backup is not connected."
        : issueStatus(syncIssues)
          ? "Cloud backup needs attention."
          : pending > 0 && !sync.autoSync
            ? `${pending} change${pending === 1 ? "" : "s"} waiting to be backed up.`
            : `Backed up to ${sync.remote?.repo ?? "remote"}.`,
    metrics: [
      { label: "Remote", value: sync?.remote?.repo ?? "—" },
      { label: "Pending changes", value: String(pending) },
      { label: "Auto-sync", value: sync?.connected ? (sync.autoSync ? "On" : "Off") : "—" }
    ],
    lastActivityAt: sync?.lastSyncAt ?? null,
    issues: syncIssues
  };

  // --- Security scans ------------------------------------------------------------
  const records = Object.values(scans.scans);
  const failedActive = records.filter((scan) => scan.verdict === "fail" && !scan.overriddenAt).length;
  const failedOverridden = records.filter((scan) => scan.verdict === "fail" && scan.overriddenAt).length;
  const warned = records.filter((scan) => scan.verdict === "warn").length;
  const passed = records.filter((scan) => scan.verdict === "pass").length;
  // Status follows the emitted issues, so stale records (asset removed) stay a
  // warning instead of an unresolvable error.
  const securityStatus: HealthStatus =
    records.length === 0 ? "inactive" : (issueStatus(issuesFor("security")) ?? "healthy");
  const security: HealthSubsystem = {
    id: "security",
    label: "Security scans",
    status: securityStatus,
    summary:
      records.length === 0
        ? "No assets scanned yet — scans run on install and update."
        : securityStatus === "healthy"
          ? `All ${records.length} scanned assets passed.`
          : `${failedActive + failedOverridden + warned} asset${failedActive + failedOverridden + warned === 1 ? "" : "s"} with scan findings.`,
    metrics: [
      { label: "Scanned", value: String(records.length) },
      { label: "Pass", value: String(passed) },
      { label: "Warn", value: String(warned + failedOverridden) },
      { label: "Fail", value: String(failedActive) }
    ],
    lastActivityAt: latestTimestamp(records.map((scan) => scan.scannedAt)),
    issues: issuesFor("security")
  };

  // --- AI provider -----------------------------------------------------------------
  const configured = aiKeyConfigured(ai);
  const aiSubsystem: HealthSubsystem = {
    id: "ai",
    label: "AI provider",
    status: configured ? "healthy" : "inactive",
    summary: configured
      ? `${PROVIDER_LABELS[ai.provider]} ready — ${ai.models[ai.provider]}.`
      : `No API key configured for ${PROVIDER_LABELS[ai.provider]}.`,
    metrics: [
      { label: "Provider", value: PROVIDER_LABELS[ai.provider] },
      { label: "Model", value: ai.models[ai.provider] || "—" }
    ],
    issues: issuesFor("ai")
  };

  const byId = new Map(
    [structure, skills, editors, syncSubsystem, security, aiSubsystem].map((subsystem) => [subsystem.id, subsystem])
  );
  const subsystems = SUBSYSTEM_ORDER.map(({ id }) => byId.get(id)!);
  const active = subsystems.filter((subsystem) => subsystem.status !== "inactive").map((subsystem) => subsystem.status);

  return {
    generatedAt: new Date().toISOString(),
    status: worst(active),
    issueCount: issues.length,
    subsystems
  };
}

/**
 * Per-subsystem status board for the Health page. One read pass feeds both the
 * unified issue list (same problems as Overview, grouped here) and the cards.
 */
export async function getHealth(chainHomeInput?: string): Promise<HealthReport> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  const [issueInputs, integrations, ai] = await Promise.all([
    collectHubIssueInputs(chainHome),
    getIntegrations(chainHome),
    getAiSettingsPublic(chainHome)
  ]);
  return buildHealthReport({ ...issueInputs, issues: buildHubIssues(issueInputs), integrations, ai });
}
