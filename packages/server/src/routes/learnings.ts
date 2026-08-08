import type { Hono } from "hono";

import { captureInputSchema } from "@chain-hub/contracts";
import {
  captureHubEvent,
  getHubLearningsTimeline,
  getHubReflectionReport
} from "@chain-hub/domain";

import type { RouteOptions } from "./options.js";

export function registerLearningsRoutes(app: Hono, options: RouteOptions): void {
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
}
