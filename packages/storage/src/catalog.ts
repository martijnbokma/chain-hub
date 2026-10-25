import { promises as fs } from "node:fs";
import path from "node:path";

import {
  type CatalogEntryResult,
  type CatalogIndex,
  catalogIndexSchema,
  type CatalogResult,
  type CatalogSource,
  type CatalogSourcesFile,
  catalogSourcesFileSchema,
  InvalidInputError,
  NotFoundError
} from "@chain-hub/contracts";

import { installLockKey, mutateInstallLock, readInstallLock } from "./install-lock.js";
import { installAssetFromSource } from "./asset-install.js";
import { installSkillFromSource } from "./skill-install.js";
import { getAsset } from "./core.js";
import { pathExists, writeFileAtomic } from "./shared.js";

/**
 * Catalog storage: source registry + index fetch/cache under
 * `system/catalogs/` (notes/docs/specs/hub-catalog.md). Indexes are pointer files
 * fetched over HTTPS (or read from disk for dev/test sources); installs reuse
 * the existing git/path install path.
 */

export const CATALOG_FETCH_TTL_MS = 60 * 60 * 1000;

const DEFAULT_SOURCE: Omit<CatalogSource, "addedAt"> = {
  id: "chain-hub",
  url: "https://raw.githubusercontent.com/martijnbokma/chain-hub-catalog/main/catalog.json",
  autoRefresh: true
};

function sourcesPath(chainHome: string): string {
  return path.join(chainHome, "system", "catalogs.json");
}

function cachePath(chainHome: string, sourceId: string): string {
  return path.join(chainHome, "system", "catalogs", `${sourceId}.json`);
}

export async function readCatalogSources(chainHome: string): Promise<CatalogSourcesFile> {
  let raw: string | null = null;
  try {
    raw = await fs.readFile(sourcesPath(chainHome), "utf8");
  } catch {
    raw = null;
  }

  if (raw !== null) {
    try {
      return catalogSourcesFileSchema.parse(JSON.parse(raw));
    } catch {
      // Corrupt state file must not kill browsing; fall back to the default.
    }
  }

  const seeded: CatalogSourcesFile = {
    version: 1,
    sources: [{ ...DEFAULT_SOURCE, addedAt: new Date().toISOString() }]
  };
  await writeCatalogSources(chainHome, seeded);
  return seeded;
}

async function writeCatalogSources(chainHome: string, file: CatalogSourcesFile): Promise<void> {
  await fs.mkdir(path.dirname(sourcesPath(chainHome)), { recursive: true });
  await writeFileAtomic(sourcesPath(chainHome), `${JSON.stringify(file, null, 2)}\n`);
}

async function readCachedIndex(chainHome: string, sourceId: string): Promise<CatalogIndex | null> {
  try {
    const raw = await fs.readFile(cachePath(chainHome, sourceId), "utf8");
    return catalogIndexSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Local paths (file:// or plain) read from disk — used for dev fixtures and tests. */
async function fetchIndex(url: string): Promise<CatalogIndex> {
  const localPath = url.startsWith("file://") ? url.slice("file://".length) : url;
  if (!/^https?:\/\//.test(localPath)) {
    const raw = await fs.readFile(localPath, "utf8");
    return catalogIndexSchema.parse(JSON.parse(raw));
  }

  const response = await fetch(localPath, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new InvalidInputError(`Catalog index fetch failed (${response.status}): ${localPath}`);
  }
  return catalogIndexSchema.parse(await response.json());
}

/**
 * Re-fetch indexes whose cache is stale. Per-source failures keep the old cache
 * and surface as `stale` on the result — browsing degrades, it does not die.
 */
export async function refreshCatalogIndexes(
  chainHome: string,
  options: { force?: boolean } = {}
): Promise<{ stale: boolean; failed: Array<{ sourceId: string; error: string }> }> {
  const file = await readCatalogSources(chainHome);
  const failed: Array<{ sourceId: string; error: string }> = [];
  let stale = false;

  for (const source of file.sources) {
    const age = source.lastFetchedAt ? Date.now() - Date.parse(source.lastFetchedAt) : Number.POSITIVE_INFINITY;
    const due = options.force || (source.autoRefresh && age > CATALOG_FETCH_TTL_MS);
    if (!due) {
      continue;
    }

    try {
      const index = await fetchIndex(source.url);
      await fs.mkdir(path.dirname(cachePath(chainHome, source.id)), { recursive: true });
      await writeFileAtomic(cachePath(chainHome, source.id), `${JSON.stringify(index, null, 2)}\n`);
      source.lastFetchedAt = new Date().toISOString();
    } catch (error) {
      failed.push({ sourceId: source.id, error: error instanceof Error ? error.message : String(error) });
      stale = true;
    }
  }

  await writeCatalogSources(chainHome, file);

  // Anything still unfetched (or fetched long ago while autoRefresh is off) reads stale.
  for (const source of file.sources) {
    if (!(await pathExists(cachePath(chainHome, source.id)))) {
      stale = true;
      if (!failed.some((failure) => failure.sourceId === source.id)) {
        failed.push({ sourceId: source.id, error: "Catalog index has not been fetched yet" });
      }
    }
  }

  return { stale, failed };
}

export async function listCatalogEntries(
  chainHome: string,
  options: { force?: boolean } = {}
): Promise<CatalogResult> {
  const { stale, failed } = await refreshCatalogIndexes(chainHome, options);
  const { sources } = await readCatalogSources(chainHome);
  const lock = await readInstallLock(chainHome);

  const entries: CatalogEntryResult[] = [];
  for (const source of sources) {
    const index = await readCachedIndex(chainHome, source.id);
    if (!index) {
      continue;
    }
    for (const entry of index.entries) {
      const installedKey = installLockKey(entry.kind, entry.id);
      const installed = Boolean(lock.entries[installedKey]);
      entries.push({ ...entry, sourceId: source.id, installed, installedName: installed ? entry.id : null });
    }
  }

  entries.sort((a, b) => a.id.localeCompare(b.id));
  return { entries, stale, failures: failed, checkedAt: new Date().toISOString() };
}

export async function resolveCatalogEntry(chainHome: string, sourceId: string, entryId: string) {
  const index = await readCachedIndex(chainHome, sourceId);
  const entry = index?.entries.find((item) => item.id === entryId);
  if (!entry) {
    throw new NotFoundError(`Catalog entry not found: ${entryId}@${sourceId}`);
  }
  return entry;
}

/**
 * Installs a catalog entry through the existing install pipeline and records
 * catalog provenance on the lock entry. Skills reuse installSkillFromSource;
 * agents/workflows go through the generalized single-file install (D6).
 */
export async function installCatalogEntry(
  chainHome: string,
  input: { sourceId: string; entryId: string; force?: boolean }
): Promise<{ asset: Awaited<ReturnType<typeof getAsset>>; scriptsDetected: boolean }> {
  const entry = await resolveCatalogEntry(chainHome, input.sourceId, input.entryId);

  if (entry.kind === "skills") {
    const result = await installSkillFromSource(
      chainHome,
      { repo: entry.source.repo, subdir: entry.source.subdir, name: entry.id, force: input.force },
      (home, kind, name) => getAsset(home, kind, name)
    );

    await mutateInstallLock(chainHome, (lockFile) => {
      const record = lockFile.entries[installLockKey("skills", entry.id)];
      if (record) {
        record.catalogId = input.sourceId;
        record.catalogEntryId = entry.id;
      }
    });

    const scriptsDetected = await pathExists(path.join(chainHome, "skills", entry.id, "scripts"));
    return { asset: result.asset, scriptsDetected };
  }

  if (entry.kind === "agents" || entry.kind === "workflows") {
    const result = await installAssetFromSource(chainHome, {
      kind: entry.kind,
      repo: entry.source.repo,
      subdir: entry.source.subdir,
      name: entry.id,
      force: input.force,
      catalogId: input.sourceId,
      catalogEntryId: entry.id
    });
    return { asset: result.asset, scriptsDetected: false };
  }

  throw new InvalidInputError(`Catalog entries of kind ${entry.kind} cannot be installed yet`);
}
