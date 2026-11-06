import path from "node:path";

import {
  type AiConfig,
  type AiSecrets,
  type RescanAssetsInput,
  type RescanAssetsResult,
  type SecurityScanFinding
} from "@chain-hub/contracts";
import {
  assertSafeAssetKind,
  getAsset,
  initializeHub,
  listAssets,
  readAiConfig,
  readAiSecrets,
  resolveChainHome,
  runSecurityGate,
  type SecurityExtraScanner
} from "@chain-hub/storage";

import { scanAssetForSecurity } from "./ai-providers.js";

async function withInitializedHub(chainHomeInput: string | undefined): Promise<string> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  return chainHome;
}

/**
 * The AI layer of the security gate. Providers that need a key only run when
 * one is configured; Ollama is always attempted (local-first, fails open and
 * the failure lands on the scan record, not on the install).
 */
function aiScanAvailable(config: AiConfig, secrets: AiSecrets): boolean {
  if (config.provider === "ollama") {
    return true;
  }
  const key = secrets[`${config.provider}ApiKey` as keyof AiSecrets];
  return typeof key === "string" && key.trim().length > 0;
}

/**
 * Builds the gate's extraScanner for the current AI configuration, or undefined
 * when no provider is usable. Install/update/import paths call this once and
 * pass the result down — the static engine always runs regardless.
 */
export async function buildSecurityExtraScanner(
  chainHome: string | undefined
): Promise<SecurityExtraScanner | undefined> {
  let config: Awaited<ReturnType<typeof readAiConfig>>;
  let secrets: Awaited<ReturnType<typeof readAiSecrets>>;
  try {
    config = await readAiConfig(chainHome);
    secrets = await readAiSecrets(chainHome);
  } catch {
    // The AI layer is best-effort: a broken or missing AI config must never
    // block an install — the static engine still runs.
    return undefined;
  }
  if (!aiScanAvailable(config, secrets)) {
    return undefined;
  }

  return async ({ kind, name, files }): Promise<SecurityScanFinding[]> =>
    scanAssetForSecurity({ config, secrets, kind, name, files });
}

/**
 * Re-runs the security gate over already-installed assets. Never blocks — the
 * verdict lands on each asset's scan record (enforce: false) so flagged
 * content surfaces in the Library without pretending it was never installed.
 */
export async function rescanHubAssets(
  chainHomeInput: string | undefined,
  input: RescanAssetsInput
): Promise<RescanAssetsResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  const kind = input.kind ? assertSafeAssetKind(input.kind) : undefined;
  const assets = (await listAssets(chainHome, kind)).filter((asset) => !input.name || asset.name === input.name);
  const extraScanner = await buildSecurityExtraScanner(chainHome);

  const results: RescanAssetsResult["results"] = [];
  for (const asset of assets) {
    const scan =
      asset.kind === "skills"
        ? await runSecurityGate(chainHome, {
            kind: asset.kind,
            name: asset.name,
            context: "rescan",
            rootDir: path.join(chainHome, "skills", asset.name),
            enforce: false,
            extraScanner
          })
        : await runSecurityGate(chainHome, {
            kind: asset.kind,
            name: asset.name,
            context: "rescan",
            files: [{ path: `${asset.name}.md`, content: (await getAsset(chainHome, asset.kind, asset.name)).content }],
            enforce: false,
            extraScanner
          });
    results.push({ kind: asset.kind, name: asset.name, scan });
  }

  return { results, scannedAt: new Date().toISOString() };
}
