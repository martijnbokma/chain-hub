import { assetKinds, type AssetKind, type Overview, type SetupGuide, type SetupStep } from "@chain-hub/contracts";

import { initializeHub, listAssets, readMeta, resolveChainHome, validateHub } from "./core.js";
import { getIntegrations } from "./integrations.js";
import { detectAgentsSkillsDrift } from "./skill-install.js";

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
