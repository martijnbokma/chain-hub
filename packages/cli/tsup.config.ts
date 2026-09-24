import { existsSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import path from "node:path";

import { defineConfig } from "tsup";

// tsup runs from packages/cli (turbo and the package scripts both use the package dir).
const dashboardSource = path.resolve("../../apps/hub-web/dist");
const dashboardTarget = path.resolve("dist/web");

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  // Workspace packages aren't published — inline them into the CLI bundle
  // so `npm install -g chain-hub` doesn't need them on the registry.
  noExternal: [/^@chain-hub\//],
  // Ship the dashboard inside the package so `chain hub` works after an npm install.
  async onSuccess() {
    if (!existsSync(path.join(dashboardSource, "index.html"))) {
      console.warn(`[chain-hub] dashboard build not found at ${dashboardSource}; run the hub-web build first`);
      return;
    }
    await rm(dashboardTarget, { recursive: true, force: true });
    await cp(dashboardSource, dashboardTarget, { recursive: true });
  }
});
