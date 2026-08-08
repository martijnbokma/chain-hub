import path from "node:path";
import { promises as fs } from "node:fs";

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";

import { summarizeAgentsSkillSync, syncAgentsSkillsIntoHub } from "@chain-hub/domain";

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
