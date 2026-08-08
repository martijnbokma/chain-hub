import type { Hono } from "hono";

import {
  connectEditors,
  getDashboardOverview,
  getGuidedSetup,
  getIntegrationStatus,
  validateChainHub
} from "@chain-hub/domain";

import type { RouteOptions } from "./options.js";

export function registerHubRoutes(app: Hono, options: RouteOptions): void {
  app.get("/api/overview", async (context) => {
    const overview = await getDashboardOverview(options.chainHome);
    return context.json(overview);
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
}
