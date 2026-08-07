import path from "node:path";
import { promises as fs } from "node:fs";

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";

import {
  captureInputSchema,
  createAssetInputSchema,
  createMemoryNoteInputSchema,
  draftAssetInputSchema,
  forkSkillInputSchema,
  importAssetInputSchema,
  installSkillBundleInputSchema,
  installSkillInputSchema,
  migrateAgentsSkillsInputSchema,
  type AssetKind,
  updateAiSettingsInputSchema,
  updateAssetInputSchema,
  updateMemoryNoteInputSchema,
  updateSkillsInputSchema
} from "@chain-hub/contracts";
import {
  AiProviderError,
  captureHubEvent,
  connectEditors,
  createHubMemoryNote,
  createLibraryAsset,
  deleteHubMemoryNote,
  deleteLibraryAsset,
  discoverLibraryAssets,
  draftHubAsset,
  forkLibrarySkill,
  getDashboardOverview,
  getGuidedSetup,
  getHubAiSettings,
  getHubLearningsTimeline,
  getHubMemory,
  getHubMemoryNote,
  getHubReflectionReport,
  getIntegrationStatus,
  getLibrary,
  getLibraryAsset,
  importLibraryAsset,
  installLibrarySkill,
  installLibrarySkillBundle,
  listHubMemoryNotes,
  migrateAgentsLibrarySkills,
  searchHubMemoryNotes,
  summarizeAgentsSkillSync,
  syncAgentsSkillsIntoHub,
  updateHubAiSettings,
  updateHubMemoryNote,
  updateLibraryAsset,
  updateLibrarySkills,
  validateChainHub
} from "@chain-hub/domain";

type StartServerOptions = {
  chainHome?: string;
  port?: number;
  staticRoot?: string;
};

export function createServer(options: StartServerOptions = {}) {
  const app = new Hono();

  app.get("/api/overview", async (context) => {
    const overview = await getDashboardOverview(options.chainHome);
    return context.json(overview);
  });

  app.get("/api/library", async (context) => {
    const kind = context.req.query("kind");
    const library = await getLibrary(options.chainHome, kind as never);
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

  app.post("/api/library/skills/fork", async (context) => {
    const payload = forkSkillInputSchema.parse(await context.req.json());
    const asset = await forkLibrarySkill(options.chainHome, payload);
    return context.json(asset, 201);
  });

  app.get("/api/library/discover", async (context) => {
    const discovered = await discoverLibraryAssets();
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
    try {
      const payload = createAssetInputSchema.parse(await context.req.json());
      const asset = await createLibraryAsset(options.chainHome, payload);
      return context.json(asset, 201);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "issues" in error &&
        Array.isArray((error as { issues: unknown }).issues)
      ) {
        const issues = (error as { issues: Array<{ message: string }> }).issues;
        const detail = issues.map((issue) => issue.message).join("; ") || "Invalid asset input";
        return context.json({ error: detail }, 400);
      }
      if (error instanceof Error) {
        const status = /already exists|cannot be empty/i.test(error.message) ? 400 : 500;
        return context.json({ error: error.message }, status);
      }
      return context.json({ error: "Unable to create asset" }, 500);
    }
  });

  app.put("/api/library/:kind/:name", async (context) => {
    const kind = context.req.param("kind") as AssetKind;
    const name = context.req.param("name");
    const payload = updateAssetInputSchema.parse(await context.req.json());
    const asset = await updateLibraryAsset(options.chainHome, kind, name, payload.content);
    return context.json(asset);
  });

  app.delete("/api/library/:kind/:name", async (context) => {
    const kind = context.req.param("kind") as AssetKind;
    const name = context.req.param("name");
    await deleteLibraryAsset(options.chainHome, kind, name);
    return context.json({ ok: true });
  });

  app.get("/api/integrations", async (context) => {
    const integrations = await getIntegrationStatus(options.chainHome);
    return context.json(integrations);
  });

  app.get("/api/validate", async (context) => {
    const validation = await validateChainHub(options.chainHome);
    return context.json(validation);
  });

  app.post("/api/integrations/setup", async (context) => {
    const integrations = await connectEditors(options.chainHome);
    return context.json(integrations);
  });

  app.get("/api/setup", async (context) => {
    const guide = await getGuidedSetup(options.chainHome);
    return context.json(guide);
  });

  app.get("/api/memory", async (context) => {
    const memory = await getHubMemory(options.chainHome);
    return context.json(memory);
  });

  app.get("/api/memory/notes", async (context) => {
    const notes = await listHubMemoryNotes(options.chainHome);
    return context.json(notes);
  });

  app.get("/api/memory/search", async (context) => {
    const query = context.req.query("q") ?? "";
    const results = await searchHubMemoryNotes(options.chainHome, query);
    return context.json(results);
  });

  app.post("/api/memory/notes", async (context) => {
    const payload = createMemoryNoteInputSchema.parse(await context.req.json());
    const note = await createHubMemoryNote(options.chainHome, payload);
    return context.json(note, 201);
  });

  app.get("/api/memory/note", async (context) => {
    const relativePath = context.req.query("path") ?? "";
    const note = await getHubMemoryNote(options.chainHome, relativePath);
    return context.json(note);
  });

  app.put("/api/memory/note", async (context) => {
    const relativePath = context.req.query("path") ?? "";
    const payload = updateMemoryNoteInputSchema.parse(await context.req.json());
    const note = await updateHubMemoryNote(options.chainHome, relativePath, payload.content);
    return context.json(note);
  });

  app.delete("/api/memory/note", async (context) => {
    const relativePath = context.req.query("path") ?? "";
    await deleteHubMemoryNote(options.chainHome, relativePath);
    return context.json({ ok: true });
  });

  app.get("/api/learnings", async (context) => {
    const limit = context.req.query("limit") ? Number(context.req.query("limit")) : 100;
    const offset = context.req.query("offset") ? Number(context.req.query("offset")) : 0;
    const timeline = await getHubLearningsTimeline(options.chainHome, limit, offset);
    return context.json(timeline);
  });

  app.post("/api/learnings/capture", async (context) => {
    const payload = captureInputSchema.parse(await context.req.json());
    const event = await captureHubEvent(options.chainHome, payload);
    return context.json(event, 201);
  });

  app.get("/api/learnings/reflect", async (context) => {
    const report = await getHubReflectionReport(options.chainHome);
    return context.json(report);
  });

  app.get("/api/settings/ai", async (context) => {
    const settings = await getHubAiSettings(options.chainHome);
    return context.json(settings);
  });

  app.put("/api/settings/ai", async (context) => {
    const payload = updateAiSettingsInputSchema.parse(await context.req.json());
    const settings = await updateHubAiSettings(options.chainHome, payload);
    return context.json(settings);
  });

  app.post("/api/ai/draft-prompt", async (context) => {
    const payload = draftAssetInputSchema.parse(await context.req.json());
    try {
      const result = await draftHubAsset(options.chainHome, payload);
      return context.json(result);
    } catch (error) {
      if (error instanceof AiProviderError) {
        const status = error.status === 502 ? 502 : 400;
        return context.json({ error: error.message }, status);
      }
      throw error;
    }
  });

  if (options.staticRoot) {
    app.use("*", serveStatic({ root: options.staticRoot }));

    app.get("*", async (context) => {
      const indexPath = path.join(options.staticRoot!, "index.html");
      const html = await fs.readFile(indexPath, "utf8");
      return context.html(html);
    });
  }

  return app;
}

export async function startServer(options: StartServerOptions = {}) {
  const port = options.port ?? 2342;
  const app = createServer(options);

  try {
    const result = await syncAgentsSkillsIntoHub(options.chainHome);
    if (result.results.length > 0) {
      console.log(summarizeAgentsSkillSync(result));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Agents skill sync failed: ${message}`);
  }

  return await new Promise<ReturnType<typeof serve>>((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port }, () => {
      resolve(server);
    });

    server.once("error", (error: Error) => {
      reject(error);
    });
  });
}
