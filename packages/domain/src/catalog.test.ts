import { describe, expect, it, vi } from "vitest";

import type { CatalogResult } from "@chain-hub/contracts";

// Thin delegation layer over @chain-hub/storage — mocked so the tests stay
// offline and never touch the real hub folder or editor sync targets.
vi.mock("@chain-hub/storage", () => ({
  initializeHub: vi.fn(),
  installCatalogEntry: vi.fn(),
  listCatalogEntries: vi.fn(),
  refreshCatalogIndexes: vi.fn(),
  resolveChainHome: vi.fn(),
  syncAssetToEditors: vi.fn()
}));

import {
  initializeHub,
  installCatalogEntry,
  listCatalogEntries,
  refreshCatalogIndexes,
  resolveChainHome,
  syncAssetToEditors
} from "@chain-hub/storage";

import { getLibraryCatalog, installLibraryCatalogEntry, refreshLibraryCatalog } from "./catalog.js";

const catalogResult: CatalogResult = { entries: [], stale: false, checkedAt: "2026-01-01T00:00:00Z" };

describe("getLibraryCatalog", () => {
  it("initializes the resolved hub and forwards list options", async () => {
    vi.mocked(resolveChainHome).mockReturnValue("/tmp/hub");
    vi.mocked(listCatalogEntries).mockResolvedValue(catalogResult);

    const result = await getLibraryCatalog(undefined, { force: true });

    expect(resolveChainHome).toHaveBeenCalledWith(undefined);
    expect(initializeHub).toHaveBeenCalledWith("/tmp/hub");
    expect(listCatalogEntries).toHaveBeenCalledWith("/tmp/hub", { force: true });
    expect(result).toBe(catalogResult);
  });
});

describe("installLibraryCatalogEntry", () => {
  it("installs via storage and syncs the asset to editors", async () => {
    vi.mocked(resolveChainHome).mockReturnValue("/tmp/hub");
    const asset = { kind: "skills", name: "demo-skill" };
    vi.mocked(installCatalogEntry).mockResolvedValue({
      asset,
      scriptsDetected: true
    } as Awaited<ReturnType<typeof installCatalogEntry>>);

    const result = await installLibraryCatalogEntry(undefined, { sourceId: "s", entryId: "e" });

    expect(installCatalogEntry).toHaveBeenCalledWith("/tmp/hub", { sourceId: "s", entryId: "e" });
    expect(syncAssetToEditors).toHaveBeenCalledWith("/tmp/hub", "skills", "demo-skill", asset);
    expect(result.scriptsDetected).toBe(true);
  });
});

describe("refreshLibraryCatalog", () => {
  it("delegates to refreshCatalogIndexes with the given options", async () => {
    vi.mocked(resolveChainHome).mockReturnValue("/tmp/hub");
    vi.mocked(refreshCatalogIndexes).mockResolvedValue({ refreshed: 2 } as never);

    const result = await refreshLibraryCatalog("custom-home", { force: true });

    expect(resolveChainHome).toHaveBeenCalledWith("custom-home");
    expect(refreshCatalogIndexes).toHaveBeenCalledWith("/tmp/hub", { force: true });
    expect(result).toEqual({ refreshed: 2 });
  });
});
