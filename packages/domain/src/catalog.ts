import type { CatalogResult, InstallCatalogEntryInput, ScanCatalogEntryInput } from "@chain-hub/contracts";
import {
  initializeHub,
  installCatalogEntry,
  listCatalogEntries,
  refreshCatalogIndexes,
  resolveChainHome,
  scanCatalogEntry,
  syncAssetToEditors
} from "@chain-hub/storage";

import { buildSecurityExtraScanner } from "./security.js";

/** Catalog use-cases: browse merged indexes, install entries, refresh sources. */

async function withInitializedHub(chainHomeInput: string | undefined): Promise<string> {
  const chainHome = resolveChainHome(chainHomeInput);
  await initializeHub(chainHome);
  return chainHome;
}

export async function getLibraryCatalog(chainHomeInput: string | undefined, options: { force?: boolean } = {}): Promise<CatalogResult> {
  const chainHome = await withInitializedHub(chainHomeInput);
  return listCatalogEntries(chainHome, options);
}

export async function installLibraryCatalogEntry(chainHomeInput: string | undefined, input: InstallCatalogEntryInput) {
  const chainHome = await withInitializedHub(chainHomeInput);
  const extraScanner = await buildSecurityExtraScanner(chainHome);
  const result = await installCatalogEntry(chainHome, input, { extraScanner });
  await syncAssetToEditors(chainHome, result.asset.kind, result.asset.name, result.asset);
  return result;
}

export async function refreshLibraryCatalog(chainHomeInput: string | undefined, options: { force?: boolean } = {}) {
  const chainHome = await withInitializedHub(chainHomeInput);
  return refreshCatalogIndexes(chainHome, options);
}

export async function scanLibraryCatalogEntry(chainHomeInput: string | undefined, input: ScanCatalogEntryInput) {
  const chainHome = await withInitializedHub(chainHomeInput);
  const extraScanner = await buildSecurityExtraScanner(chainHome);
  return scanCatalogEntry(chainHome, input, { extraScanner });
}
