import type { Hono } from "hono";

import { saveAnalysisInputSchema, updateAnalysisItemInputSchema } from "@chain-hub/contracts";
import { getHubAnalysisReport, saveHubAnalysisReport, updateHubAnalysisItemStatus } from "@chain-hub/domain";

import type { RouteOptions } from "./options.js";

export function registerAnalysisRoutes(app: Hono, options: RouteOptions): void {
  app.get("/api/analysis", async (context) => {
    const report = await getHubAnalysisReport(options.chainHome);
    return context.json(report);
  });

  app.put("/api/analysis", async (context) => {
    const payload = saveAnalysisInputSchema.parse(await context.req.json());
    const report = await saveHubAnalysisReport(options.chainHome, payload);
    return context.json(report);
  });

  app.patch("/api/analysis/items", async (context) => {
    const payload = updateAnalysisItemInputSchema.parse(await context.req.json());
    const report = await updateHubAnalysisItemStatus(options.chainHome, payload);
    return context.json(report);
  });
}
