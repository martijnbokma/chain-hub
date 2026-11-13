import type { Hono } from "hono";

import {
  captureInputSchema,
  foldLearningsInputSchema,
  learningsTimelineQuerySchema,
  resolveLearningsInputSchema
} from "@chain-hub/contracts";
import {
  captureHubEvent,
  foldHubLearnings,
  getHubFoldArtifact,
  getHubLearningsTimeline,
  getHubReflectionReport,
  listHubFoldArtifacts,
  resolveHubSkillLearnings
} from "@chain-hub/domain";

import type { RouteOptions } from "./options.js";

export function registerLearningsRoutes(app: Hono, options: RouteOptions): void {
  app.get("/api/learnings", async (context) => {
    const { limit, offset } = learningsTimelineQuerySchema.parse({
      limit: context.req.query("limit"),
      offset: context.req.query("offset")
    });
    const timeline = await getHubLearningsTimeline(options.chainHome, limit, offset);
    return context.json(timeline);
  });

  app.post("/api/learnings/capture", async (context) => {
    const payload = captureInputSchema.parse(await context.req.json());
    const event = await captureHubEvent(options.chainHome, payload);
    return context.json(event, 201);
  });

  app.post("/api/learnings/resolve", async (context) => {
    const payload = resolveLearningsInputSchema.parse(await context.req.json());
    const result = await resolveHubSkillLearnings(options.chainHome, payload.skill);
    return context.json(result);
  });

  app.post("/api/learnings/fold", async (context) => {
    const payload = foldLearningsInputSchema.parse(await context.req.json().catch(() => ({})));
    const result = await foldHubLearnings(options.chainHome, payload);
    return context.json(result);
  });

  app.get("/api/learnings/folds", async (context) => {
    return context.json(await listHubFoldArtifacts(options.chainHome));
  });

  app.get("/api/learnings/folds/:date/:skill", async (context) => {
    const artifact = await getHubFoldArtifact(
      options.chainHome,
      context.req.param("date"),
      context.req.param("skill")
    );
    return context.json(artifact);
  });

  app.get("/api/learnings/reflect", async (context) => {
    const report = await getHubReflectionReport(options.chainHome);
    return context.json(report);
  });
}
