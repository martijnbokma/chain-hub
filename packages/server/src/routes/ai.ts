import type { Hono } from "hono";

import {
  auditAssetInputSchema,
  classifyAssetInputSchema,
  draftAssetInputSchema,
  improveAssetInputSchema,
  updateAiSettingsInputSchema
} from "@chain-hub/contracts";
import {
  AiProviderError,
  auditHubAsset,
  classifyHubAsset,
  draftHubAsset,
  getHubAiSettings,
  improveHubAsset,
  updateHubAiSettings
} from "@chain-hub/domain";

import type { RouteOptions } from "./options.js";

function handleAiError(error: unknown): { error: string; status: 400 | 502 } | null {
  if (error instanceof AiProviderError) {
    return { error: error.message, status: error.status === 502 ? 502 : 400 };
  }
  return null;
}

export function registerAiRoutes(app: Hono, options: RouteOptions): void {
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
      const mapped = handleAiError(error);
      if (mapped) {
        return context.json({ error: mapped.error }, mapped.status);
      }
      throw error;
    }
  });

  app.post("/api/ai/classify-asset", async (context) => {
    const payload = classifyAssetInputSchema.parse(await context.req.json());
    try {
      const result = await classifyHubAsset(options.chainHome, payload);
      return context.json(result);
    } catch (error) {
      const mapped = handleAiError(error);
      if (mapped) {
        return context.json({ error: mapped.error }, mapped.status);
      }
      throw error;
    }
  });

  app.post("/api/ai/audit-asset", async (context) => {
    const payload = auditAssetInputSchema.parse(await context.req.json());
    try {
      const result = await auditHubAsset(options.chainHome, payload);
      return context.json(result);
    } catch (error) {
      const mapped = handleAiError(error);
      if (mapped) {
        return context.json({ error: mapped.error }, mapped.status);
      }
      throw error;
    }
  });

  app.post("/api/ai/improve-asset", async (context) => {
    const payload = improveAssetInputSchema.parse(await context.req.json());
    try {
      const result = await improveHubAsset(options.chainHome, payload);
      return context.json(result);
    } catch (error) {
      const mapped = handleAiError(error);
      if (mapped) {
        return context.json({ error: mapped.error }, mapped.status);
      }
      throw error;
    }
  });
}
