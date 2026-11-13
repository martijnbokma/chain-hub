import type { Hono } from "hono";

import { rescanAssetsInputSchema } from "@chain-hub/contracts";
import { removeHubSecurityScan, rescanHubAssets } from "@chain-hub/domain";

import type { RouteOptions } from "./options.js";

export function registerSecurityRoutes(app: Hono, options: RouteOptions): void {
  // Re-runs the scan over installed assets (all, one kind, or one asset). Never
  // blocks — verdicts land on each asset's scan record and are returned here.
  app.post("/api/security/rescan", async (context) => {
    const payload = rescanAssetsInputSchema.parse(await context.req.json().catch(() => ({})));
    const result = await rescanHubAssets(options.chainHome, payload);
    return context.json(result);
  });

  // Deletes one persisted scan record — the remediation for stale records the
  // Health page surfaces on assets that no longer exist.
  app.delete("/api/security/scans/:kind/:name", async (context) => {
    const result = await removeHubSecurityScan(
      options.chainHome,
      context.req.param("kind"),
      context.req.param("name")
    );
    return context.json(result);
  });
}
