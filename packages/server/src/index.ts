import path from "node:path";
import { promises as fs } from "node:fs";

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";

import { handleError } from "./http-errors.js";
import { requestGuard, type RequestGuardOptions } from "./request-guard.js";

import { registerAiRoutes } from "./routes/ai.js";
import { registerAnalysisRoutes } from "./routes/analysis.js";
import { registerHubRoutes } from "./routes/hub.js";
import { registerLearningsRoutes } from "./routes/learnings.js";
import { registerLibraryRoutes } from "./routes/library.js";
import { registerSyncRoutes } from "./routes/sync.js";

type StartServerOptions = {
  chainHome?: string;
  port?: number;
  staticRoot?: string;
  /** Interface to bind. Defaults to loopback so other machines on the network cannot reach the hub. */
  hostname?: string;
  requestGuard?: RequestGuardOptions;
};

export const DEFAULT_HOSTNAME = "127.0.0.1";

/** Largest request body the API accepts; skill folder uploads are the biggest legitimate payload. */
export const MAX_BODY_BYTES = 25 * 1024 * 1024;

export function createServer(options: StartServerOptions = {}) {
  const app = new Hono();
  const routeOptions = { chainHome: options.chainHome };

  app.use(
    "*",
    secureHeaders({
      xFrameOptions: "DENY",
      referrerPolicy: "no-referrer",
      contentSecurityPolicy: { frameAncestors: ["'none'"] }
    })
  );
  app.use("*", requestGuard(options.requestGuard));
  app.use(
    "/api/*",
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (context) =>
        context.json(
          { error: "Request is too large (max 25 MB). Leave out build output such as node_modules and try again." },
          413
        )
    })
  );
  app.onError(handleError);

  registerHubRoutes(app, routeOptions);
  registerLibraryRoutes(app, routeOptions);
  registerLearningsRoutes(app, routeOptions);
  registerAiRoutes(app, routeOptions);
  registerAnalysisRoutes(app, routeOptions);
  registerSyncRoutes(app, routeOptions);

  // Before the SPA fallback, so API clients get JSON instead of the dashboard page.
  app.all("/api/*", (context) => context.json({ error: "Unknown API route" }, 404));

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
  const hostname = options.hostname ?? DEFAULT_HOSTNAME;
  const app = createServer(options);

  return await new Promise<ReturnType<typeof serve>>((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port, hostname }, () => {
      resolve(server);
    });

    server.once("error", (error: Error) => {
      reject(error);
    });
  });
}
