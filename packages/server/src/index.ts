import path from "node:path";
import { promises as fs } from "node:fs";

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";

import { registerAiRoutes } from "./routes/ai.js";
import { registerHubRoutes } from "./routes/hub.js";
import { registerLearningsRoutes } from "./routes/learnings.js";
import { registerLibraryRoutes } from "./routes/library.js";
import { registerMemoryRoutes } from "./routes/memory.js";

type StartServerOptions = {
  chainHome?: string;
  port?: number;
  staticRoot?: string;
};

export function createServer(options: StartServerOptions = {}) {
  const app = new Hono();
  const routeOptions = { chainHome: options.chainHome };

  registerHubRoutes(app, routeOptions);
  registerLibraryRoutes(app, routeOptions);
  registerMemoryRoutes(app, routeOptions);
  registerLearningsRoutes(app, routeOptions);
  registerAiRoutes(app, routeOptions);

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

  return await new Promise<ReturnType<typeof serve>>((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port }, () => {
      resolve(server);
    });

    server.once("error", (error: Error) => {
      reject(error);
    });
  });
}
