import type { CatalogResult, InstallCatalogEntryInput } from "@chain-hub/contracts";
import {
  initializeHub,
  installCatalogEntry,
  listCatalogEntries,
  refreshCatalogIndexes,
  resolveChainHome,
  syncAssetToEditors
} from "@chain-hub/storage";

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
  const result = await installCatalogEntry(chainHome, input);
  await syncAssetToEditors(chainHome, result.asset.kind, result.asset.name, result.asset);
  return result;
}

export async function refreshLibraryCatalog(chainHomeInput: string | undefined, options: { force?: boolean } = {}) {
  const chainHome = await withInitializedHub(chainHomeInput);
  return refreshCatalogIndexes(chainHome, options);
}
