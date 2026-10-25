import type { Hono } from "hono";

import {
  assetKindSchema,
  checkSkillUpdatesInputSchema,
  convertAssetInputSchema,
  createAssetInputSchema,
  installCatalogEntryInputSchema,
  forkSkillInputSchema,
  importAssetInputSchema,
  installSkillBundleInputSchema,
  installSkillInputSchema,
  migrateAgentsSkillsInputSchema,
  relinkSkillInputSchema,
  unlinkSkillInputSchema,
  renameAssetInputSchema,
  type AssetKind,
  updateAssetInputSchema,
  updateSkillsInputSchema
} from "@chain-hub/contracts";
import {
  checkLibrarySkillUpdates,
  convertLibraryAssetKind,
  getLibraryCatalog,
  installLibraryCatalogEntry,
  createLibraryAsset,
  deleteLibraryAsset,
  discoverLibraryAssets,
  forkLibrarySkill,
  getLibrary,
  getLibraryAsset,
  getLibrarySkillUpstreamDirs,
  getSkillFile,
  getSkillFiles,
  importLibraryAsset,
  installLibrarySkill,
  installLibrarySkillBundle,
  migrateAgentsLibrarySkills,
  relinkLibrarySkill,
  renameLibraryAsset,
  unlinkLibrarySkill,
  updateLibraryAsset,
  updateLibrarySkills
} from "@chain-hub/domain";

import type { RouteOptions } from "./options.js";

export function registerLibraryRoutes(app: Hono, options: RouteOptions): void {
  app.get("/api/library", async (context) => {
    const kind = context.req.query("kind");
    const library = await getLibrary(options.chainHome, kind === undefined ? undefined : assetKindSchema.parse(kind));
    return context.json(library);
  });

  app.post("/api/library/skills/install", async (context) => {
    const payload = installSkillInputSchema.parse(await context.req.json());
    const result = await installLibrarySkill(options.chainHome, payload);
    return context.json(result, 201);
  });

  app.post("/api/library/skills/install-bundle", async (context) => {
    const payload = installSkillBundleInputSchema.parse(await context.req.json());
    const result = await installLibrarySkillBundle(options.chainHome, payload);
    return context.json(result, 201);
  });

  app.get("/api/catalog", async (context) => {
    const refresh = context.req.query("refresh") === "true";
    const result = await getLibraryCatalog(options.chainHome, { force: refresh });
    return context.json(result);
  });

  app.post("/api/catalog/install", async (context) => {
    const payload = installCatalogEntryInputSchema.parse(await context.req.json());
    const result = await installLibraryCatalogEntry(options.chainHome, payload);
    return context.json(result, 201);
  });

  app.get("/api/library/skills/check-updates", async (context) => {
    const force = context.req.query("force") === "true";
    const name = context.req.query("name");
    const result = await checkLibrarySkillUpdates(options.chainHome, { force, name: name ?? undefined });
    return context.json(result);
  });

  app.post("/api/library/skills/check-updates", async (context) => {
    const body = await context.req.json().catch(() => ({}));
    const payload = checkSkillUpdatesInputSchema.parse(body ?? {});
    const result = await checkLibrarySkillUpdates(options.chainHome, payload);
    return context.json(result);
  });

  app.post("/api/library/skills/update", async (context) => {
    const body = await context.req.json().catch(() => ({}));
    const payload = updateSkillsInputSchema.parse(body ?? {});
    const result = await updateLibrarySkills(options.chainHome, payload);
    return context.json(result);
  });

  app.post("/api/library/skills/migrate-agents", async (context) => {
    const body = await context.req.json().catch(() => ({}));
    const payload = migrateAgentsSkillsInputSchema.parse(body ?? {});
    const result = await migrateAgentsLibrarySkills(options.chainHome, payload);
    return context.json(result);
  });

  app.get("/api/library/skills/:name/upstream-dirs", async (context) => {
    const name = context.req.param("name");
    const result = await getLibrarySkillUpstreamDirs(options.chainHome, name);
    return context.json(result);
  });

  app.post("/api/library/skills/:name/relink", async (context) => {
    const name = context.req.param("name");
    const payload = relinkSkillInputSchema.parse(await context.req.json());
    const result = await relinkLibrarySkill(options.chainHome, name, payload.subdir);
    return context.json(result);
  });

  app.post("/api/library/skills/:name/unlink", async (context) => {
    const name = context.req.param("name");
    const body = await context.req.json().catch(() => ({}));
    const payload = unlinkSkillInputSchema.parse(body ?? {});
    const result = await unlinkLibrarySkill(options.chainHome, name, payload.reason);
    return context.json(result);
  });

  app.post("/api/library/skills/fork", async (context) => {
    const payload = forkSkillInputSchema.parse(await context.req.json());
    const asset = await forkLibrarySkill(options.chainHome, payload);
    return context.json(asset, 201);
  });

  app.get("/api/library/skills/:name/files", async (context) => {
    const name = context.req.param("name");
    const files = await getSkillFiles(options.chainHome, name);
    return context.json({ files });
  });

  app.get("/api/library/skills/:name/files/:path{.+}", async (context) => {
    const name = context.req.param("name");
    const relativePath = context.req.param("path");
    const file = await getSkillFile(options.chainHome, name, relativePath);
    return context.json(file);
  });

  app.get("/api/library/discover", async (context) => {
    const discovered = await discoverLibraryAssets(options.chainHome);
    return context.json(discovered);
  });

  app.post("/api/library/import", async (context) => {
    const payload = importAssetInputSchema.parse(await context.req.json());
    const asset = await importLibraryAsset(options.chainHome, payload);
    return context.json(asset, 201);
  });

  app.get("/api/library/:kind/:name", async (context) => {
    const kind = context.req.param("kind") as AssetKind;
    const name = context.req.param("name");
    const asset = await getLibraryAsset(options.chainHome, kind, name);
    return context.json(asset);
  });

  app.post("/api/library", async (context) => {
    const payload = createAssetInputSchema.parse(await context.req.json());
    const asset = await createLibraryAsset(options.chainHome, payload);
    return context.json(asset, 201);
  });

  app.put("/api/library/:kind/:name", async (context) => {
    const kind = context.req.param("kind") as AssetKind;
    const name = context.req.param("name");
    const payload = updateAssetInputSchema.parse(await context.req.json());
    const asset = await updateLibraryAsset(options.chainHome, kind, name, payload.content);
    return context.json(asset);
  });

  app.post("/api/library/:kind/:name/rename", async (context) => {
    const kind = context.req.param("kind") as AssetKind;
    const name = context.req.param("name");
    const payload = renameAssetInputSchema.parse(await context.req.json());
    const asset = await renameLibraryAsset(options.chainHome, kind, name, payload);
    return context.json(asset);
  });

  app.post("/api/library/:kind/:name/convert", async (context) => {
    const kind = context.req.param("kind") as AssetKind;
    const name = context.req.param("name");
    const payload = convertAssetInputSchema.parse(await context.req.json());
    const asset = await convertLibraryAssetKind(options.chainHome, kind, name, payload);
    return context.json(asset);
  });

  app.delete("/api/library/:kind/:name", async (context) => {
    const kind = context.req.param("kind") as AssetKind;
    const name = context.req.param("name");
    await deleteLibraryAsset(options.chainHome, kind, name);
    return context.json({ ok: true });
  });
}
