import type { Hono } from "hono";

import {
  connectHubSync,
  disconnectHubSync,
  getHubSyncStatus,
  resolveHubSyncConflicts,
  syncHubNow
} from "@chain-hub/domain";
import { resolveConflictsInputSchema, syncConnectInputSchema } from "@chain-hub/contracts";

import type { RouteOptions } from "./options.js";

export function registerSyncRoutes(app: Hono, options: RouteOptions): void {
  app.get("/api/sync/status", async (context) => {
    const status = await getHubSyncStatus(options.chainHome);
    return context.json(status);
  });

  app.post("/api/sync/connect", async (context) => {
    const payload = syncConnectInputSchema.parse(await context.req.json());
    const status = await connectHubSync(options.chainHome, payload);
    return context.json(status, 201);
  });

  app.post("/api/sync/disconnect", async (context) => {
    const status = await disconnectHubSync(options.chainHome);
    return context.json(status);
  });

  app.post("/api/sync/now", async (context) => {
    const status = await syncHubNow(options.chainHome);
    return context.json(status);
  });

  app.post("/api/sync/resolve", async (context) => {
    const payload = resolveConflictsInputSchema.parse(await context.req.json());
    const status = await resolveHubSyncConflicts(options.chainHome, payload);
    return context.json(status);
  });
}
