import {
  assetKinds,
  type AssetKind,
  type HubIssue,
  type HubIssueAction,
  type HubIssuesResult,
  type Overview,
  type SetupGuide,
  type SetupStep
} from "@chain-hub/contracts";

import { initializeHub, listAssets, readMeta, resolveChainHome, validateHub } from "./core.js";
import { getIntegrations } from "./integrations.js";
import { detectAgentsSkillsDrift, readSkillsLock } from "./skill-install.js";
import { getSyncStatus } from "./sync.js";

export async function getOverview(chainHomeInput?: string): Promise<Overview> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  const meta = await readMeta(chainHome);
  const validation = await validateHub(chainHome);
  const assets = await listAssets(chainHome);
  const agentsSkillsDrift = await detectAgentsSkillsDrift(chainHome);

  const assetCounts = assetKinds.reduce<Record<AssetKind, number>>((accumulator, kind) => {
    accumulator[kind] = assets.filter((asset) => asset.kind === kind).length;
    return accumulator;
  }, {} as Record<AssetKind, number>);

  return {
    chainHome,
    initializedAt: meta.initializedAt,
    assetCounts,
    health: {
      initialized: meta.initializedAt !== null,
      issues: validation.issues
    },
    storage: {
      indexedAssets: assets.length
    },
    agentsSkillsDrift
  };
}

/**
 * Every problem the hub knows about, in one list: structural validation issues,
 * agents↔hub drift, persisted skill check/update failures, and per-asset
 * editor-compat findings. Sorted errors-first so callers can render it as-is.
 */
export async function listHubIssues(chainHomeInput?: string): Promise<HubIssuesResult> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  const validation = await validateHub(chainHome);
  const assets = await listAssets(chainHome);
  const drift = await detectAgentsSkillsDrift(chainHome);
  const lock = await readSkillsLock(chainHome);

  const issues: HubIssue[] = [];
  const presentAssets = new Set(assets.map((asset) => `${asset.kind}/${asset.name}`));
  const openAsset = (name: string): HubIssueAction[] =>
    presentAssets.has(`skills/${name}`) ? ["open-asset"] : [];

  validation.issues.forEach((message, index) => {
    issues.push({
      id: `health:${index}`,
      severity: "error",
      kind: "health",
      title: message,
      actions: ["open-setup"]
    });
  });

  if (drift.missingCount > 0) {
    issues.push({
      id: "agents-drift",
      severity: "warning",
      kind: "agents-drift",
      title: `${drift.missingCount} skill${drift.missingCount === 1 ? "" : "s"} in ~/.agents not in Hub yet`,
      detail: drift.missingNames.join(", "),
      actions: ["import-agents"]
    });
  }

  for (const [name, entry] of Object.entries(lock.skills)) {
    if (entry.unlinkedAt) {
      continue;
    }
    const relink: HubIssueAction[] = entry.sourceType === "git" ? ["relink"] : [];
    if (entry.lastCheckError) {
      issues.push({
        id: `skill-check:${name}`,
        severity: "error",
        kind: "skill-check",
        title: `Update check failed for ${name}`,
        detail: entry.lastCheckError,
        assetKind: "skills",
        assetName: name,
        actions: ["retry-check", ...relink, ...openAsset(name), "unlink"]
      });
    }
    if (entry.lastUpdateError) {
      issues.push({
        id: `skill-update:${name}`,
        severity: "error",
        kind: "skill-update",
        title: `Update failed for ${name}`,
        detail: entry.lastUpdateError,
        assetKind: "skills",
        assetName: name,
        actions: ["retry-update", ...relink, ...openAsset(name), "unlink"]
      });
    }
  }

  for (const asset of assets) {
    for (const issue of asset.compatIssues ?? []) {
      issues.push({
        id: `compat:${asset.kind}/${asset.name}:${issue.code}`,
        severity: issue.severity,
        kind: "compat",
        title: `${asset.kind}/${asset.name}`,
        detail: issue.message,
        assetKind: asset.kind,
        assetName: asset.name,
        actions: ["open-asset"]
      });
    }
  }

  // Sync only raises issues a human must resolve: pending changes with
  // auto-sync on converge by themselves via the server's periodic sync.
  try {
    const sync = await getSyncStatus(chainHome);
    if (sync.conflicts.length > 0) {
      issues.push({
        id: "sync:conflicts",
        severity: "error",
        kind: "sync",
        title: "Cloud backup has merge conflicts",
        detail: `${sync.conflicts.length} file(s) changed on two machines — pick a version per file to resume syncing.`,
        actions: ["open-integrations"]
      });
    } else if (sync.lastSyncError) {
      issues.push({
        id: "sync:error",
        severity: "error",
        kind: "sync",
        title: "Cloud backup sync failed",
        detail: sync.lastSyncError,
        actions: ["open-integrations"]
      });
    } else if (sync.connected && !sync.autoSync && sync.uncommitted + sync.ahead > 0) {
      const pending = sync.uncommitted + sync.ahead;
      issues.push({
        id: "sync:pending",
        severity: "warning",
        kind: "sync",
        title: `${pending} change${pending === 1 ? "" : "s"} not backed up`,
        detail: "Auto-sync is off — sync manually from Integrations.",
        actions: ["open-integrations"]
      });
    }
  } catch {
    // Sync status is best-effort here; the sync API reports hard failures itself.
  }

  issues.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "error" ? -1 : 1;
    }
    return a.title.localeCompare(b.title);
  });

  return { issues };
}

export async function getSetupGuide(chainHomeInput?: string): Promise<SetupGuide> {
  const chainHome = resolveChainHome(chainHomeInput);
  const overview = await getOverview(chainHome);
  const integrations = await getIntegrations(chainHome);
  // Only editors installed on this machine count; nobody should need all five to finish setup.
  const installedEditors = integrations.filter((integration) => integration.installed);
  const editorsConnected =
    installedEditors.length > 0 && installedEditors.every((integration) => integration.connected);
  const validation = await validateHub(chainHome);

  const steps: SetupStep[] = [
    {
      id: "initialize",
      label: "Initialize local hub",
      description: "Create the local hub folder that becomes the one source every editor reads from.",
      complete: overview.health.initialized,
      action: "init",
      status: "pending"
    },
    {
      id: "create-first-asset",
      label: "Create first asset",
      description: "Add at least one reusable skill, rule, workflow, or agent.",
      complete: overview.storage.indexedAssets > 0,
      action: "create-asset",
      status: "pending"
    },
    {
      id: "connect-editors",
      label: "Connect editors",
      description:
        installedEditors.length > 0
          ? `Sync the hub into ${new Intl.ListFormat("en", { type: "conjunction" }).format(
              installedEditors.map((integration) => integration.label)
            )} so they all stay up to date.`
          : "No supported editor found yet. Install Cursor, Claude Code, Windsurf, Zed or Google Antigravity, then connect it here.",
      complete: editorsConnected,
      action: "connect",
      status: "pending"
    },
    {
      id: "validate",
      label: "Validate structure",
      description: "Run a structural validation pass before daily use.",
      complete: validation.ok,
      action: "validate",
      status: "pending"
    }
  ];

  let currentAssigned = false;

  for (const step of steps) {
    if (step.complete) {
      step.status = "done";
      continue;
    }

    if (!currentAssigned) {
      step.status = "current";
      currentAssigned = true;
      continue;
    }

    step.status = "pending";
  }

  return {
    chainHome,
    steps,
    nextAction: currentAssigned ? steps.find((step) => step.status === "current")!.action : "done"
  };
}
